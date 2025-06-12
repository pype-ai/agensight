"""LLM evaluated metric based on the GEval framework: https://arxiv.org/pdf/2303.16634.pdf"""

from typing import Optional, List, Tuple, Union
from agensight.eval.metrics import BaseMetric
from agensight.eval.test_case import (
    ModelTestCase,
    ModelTestCaseParams,
    ConversationalTestCase,
)
from agensight.eval.metrics.geval.template import GEvalTemplate
from agensight.eval.utils import get_or_create_event_loop, prettify_list
from agensight.eval.metrics.utils import (
    construct_verbose_logs,
    trimAndLoadJson,
    check_llm_test_case_params,
    initialize_model,
)
from agensight.eval.models import DeepEvalBaseLLM
from agensight.eval.metrics.indicator import metric_progress_indicator
from agensight.eval.metrics.geval.schema import *
from agensight.eval.metrics.geval.utils import (
    Rubric,
    construct_g_eval_params_string,
    construct_test_case_string,
    format_rubrics,
    no_log_prob_support,
    calculate_weighted_summed_score,
    validate_and_sort_rubrics,
    validate_criteria_and_evaluation_steps,
    number_evaluation_steps,
    get_score_range,
)


class GEvalEvaluator(BaseMetric):
    def __init__(
        self,
        name: str,
        evaluation_params:Optional[List[ModelTestCaseParams]] = None,
        criteria: Optional[str] = None,
        evaluation_steps: Optional[List[str]] = None,
        rubric: Optional[List[Rubric]] = None,
        model: Optional[Union[str, DeepEvalBaseLLM]] = None,
        threshold: float = 0.5,
        top_logprobs: int = 20,
        async_mode: bool = False,
        strict_mode: bool = False,
        verbose_mode: bool = False,
        _include_g_eval_suffix: bool = True,
    ):  
        
        validate_criteria_and_evaluation_steps(criteria, evaluation_steps)
        self.name = name
        self.evaluation_params = evaluation_params
        if self.evaluation_params is None:
            self.evaluation_params = [ModelTestCaseParams.INPUT, ModelTestCaseParams.ACTUAL_OUTPUT]
        self.criteria = criteria
        self.rubric = validate_and_sort_rubrics(rubric)
        self.model, self.using_native_model = initialize_model(model)
        self.evaluation_model = self.model.get_model_name()
        self.evaluation_steps = evaluation_steps
        
        # Convert threshold to float
        if isinstance(threshold, str):
            self.threshold = float(threshold)
        else:
            self.threshold = float(threshold) if threshold is not None else 0.5
            
        self.top_logprobs = top_logprobs
        
        # Convert all boolean parameters properly
        self.strict_mode = self._convert_to_bool(strict_mode)
        self.async_mode = self._convert_to_bool(async_mode)
        self.verbose_mode = self._convert_to_bool(verbose_mode)
        self._include_g_eval_suffix = self._convert_to_bool(_include_g_eval_suffix)

    def _convert_to_bool(self, value):
        """Convert various representations to proper boolean"""
        if isinstance(value, bool):
            return value
        elif isinstance(value, str):
            return value.lower() in ('true', '1', 'yes', 'on')
        elif isinstance(value, (int, float)):
            return bool(value)
        else:
            return bool(value)

    def measure(
        self,
        test_case: Union[ModelTestCase, ConversationalTestCase],
        _show_indicator: bool = True,
        _in_component: bool = False,
        _additional_context: Optional[str] = None,
    ) -> float:
        if isinstance(test_case, ConversationalTestCase):
            test_case = test_case.turns[-1]

        check_llm_test_case_params(test_case, self.evaluation_params, self)
        self.evaluation_cost = 0 if self.using_native_model else None
        if self.async_mode == True:
            loop = get_or_create_event_loop()
            loop.run_until_complete(
                self.a_measure(
                    test_case,
                    _show_indicator=False,
                    _in_component=_in_component,
                    _additional_context=_additional_context,
                )
            )
        else:
            self.evaluation_steps: List[str] = (
                self._generate_evaluation_steps()
            )

        try:
            print("line 95 geval" , self.async_mode)
            g_score, reason = self._evaluate(
                test_case, _additional_context=_additional_context
            )
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise

        try:
            self.reason = reason
        except Exception as e:
            raise

        try:
            self.score = float(g_score) / 10
        except Exception as e:
            raise

        try:
            original_score = self.score

            self.score = (
                0
                if self.strict_mode and (original_score < self.threshold)
                else original_score
            )
        except Exception as e:
            raise

        try:
            self.success = self.score >= self.threshold
            print(f"line 119 geval - success: {self.success}")
        except Exception as e:
            print(f"❌ ERROR setting success: {type(e).__name__}: {e}")
            raise

        try:
            self.verbose_logs = construct_verbose_logs(
                self,
                steps=[
                    f"Criteria:\n{self.criteria}",
                    f"Evaluation Steps:\n{prettify_list(self.evaluation_steps)}",
                    f"Rubric:\n{format_rubrics(self.rubric)}",
                    f"Score: {self.score}\nReason: {self.reason}",
                ],
            )
            print("line 126 geval" , self.score)
        except Exception as e:
            print(f"❌ ERROR creating verbose_logs: {type(e).__name__}: {e}")
            raise
        
        return self.score

    async def a_measure(
        self,
        test_case: Union[ModelTestCase, ConversationalTestCase],
        _show_indicator: bool = True,
        _in_component: bool = False,
        _additional_context: Optional[str] = None,
    ) -> float:
        if isinstance(test_case, ConversationalTestCase):
            test_case = test_case.turns[-1]
        check_llm_test_case_params(test_case, self.evaluation_params, self)

        self.evaluation_cost = 0 if self.using_native_model else None
        with metric_progress_indicator(
            self,
            async_mode=True,
            _show_indicator=_show_indicator,
            _in_component=_in_component,
        ):
            self.evaluation_steps: List[str] = (
                await self._a_generate_evaluation_steps()
            )
            g_score, reason = await self._a_evaluate(
                test_case, _additional_context=_additional_context
            )
            self.reason = reason
            self.score = (
                float(g_score) / 10 if not self.strict_mode else int(g_score)
            )
            self.success = self.score >= self.threshold
            self.verbose_logs = construct_verbose_logs(
                self,
                steps=[
                    f"Criteria:\n{self.criteria}",
                    f"Evaluation Steps:\n{prettify_list(self.evaluation_steps)}",
                    f"Rubric:\n{format_rubrics(self.rubric)}",
                    f"Score: {self.score}\nReason: {self.reason}",
                ],
            )
            return self.score

    async def _a_generate_evaluation_steps(self) -> List[str]:
        if self.evaluation_steps:
            return self.evaluation_steps

        g_eval_params_str = construct_g_eval_params_string(
            self.evaluation_params
        )
        prompt = GEvalTemplate.generate_evaluation_steps(
            criteria=self.criteria, parameters=g_eval_params_str
        )
        if self.using_native_model:
            res, cost = await self.model.a_generate(prompt)
            self.evaluation_cost += cost
            data = trimAndLoadJson(res, self)
            return data["steps"]
        else:
            try:
                res: Steps = await self.model.a_generate(prompt, schema=Steps)
                return res.steps
            except TypeError:
                res = await self.model.a_generate(prompt)
                data = trimAndLoadJson(res, self)
                return data["steps"]

    def _generate_evaluation_steps(self) -> List[str]:
        if self.evaluation_steps:
            return self.evaluation_steps

        g_eval_params_str = construct_g_eval_params_string(
            self.evaluation_params
        )
        prompt = GEvalTemplate.generate_evaluation_steps(
            criteria=self.criteria, parameters=g_eval_params_str
        )
        if self.using_native_model:
            res, cost = self.model.generate(prompt)
            self.evaluation_cost += cost
            data = trimAndLoadJson(res, self)
            return data["steps"]
        else:
            try:
                res: Steps = self.model.generate(prompt, schema=Steps)
                return res.steps
            except TypeError:
                res = self.model.generate(prompt)
                data = trimAndLoadJson(res, self)
                return data["steps"]

    async def _a_evaluate(
        self, test_case: ModelTestCase, _additional_context: Optional[str] = None
    ) -> Tuple[Union[int, float], str]:
        test_case_content = construct_test_case_string(
            self.evaluation_params, test_case
        )
        g_eval_params_str = construct_g_eval_params_string(
            self.evaluation_params
        )
        if not self.strict_mode:
            rubric_str = format_rubrics(self.rubric) if self.rubric else None
            prompt = GEvalTemplate.generate_evaluation_results(
                evaluation_steps=number_evaluation_steps(self.evaluation_steps),
                test_case_content=test_case_content,
                parameters=g_eval_params_str,
                rubric=rubric_str,
                score_range=get_score_range(self.rubric),
                _additional_context=_additional_context,
            )
        else:
            prompt = GEvalTemplate.generate_strict_evaluation_results(
                evaluation_steps=number_evaluation_steps(self.evaluation_steps),
                test_case_content=test_case_content,
                parameters=g_eval_params_str,
                _additional_context=_additional_context,
            )

        try:
            # don't use log probabilities for unsupported gpt models
            if no_log_prob_support(self.model):
                raise AttributeError("log_probs unsupported.")

            # Don't have to check for using native model
            # since generate raw response only exist for agensight.eval's native model
            res, cost = await self.model.a_generate_raw_response(
                prompt, top_logprobs=self.top_logprobs
            )
            self.evaluation_cost += cost
            data = trimAndLoadJson(res.choices[0].message.content, self)

            reason = data["reason"]
            score = data["score"]
            if self.strict_mode:
                return score, reason

            try:
                weighted_summed_score = calculate_weighted_summed_score(
                    score, res
                )
                return weighted_summed_score, reason
            except:
                return score, reason
        except (
            AttributeError
        ):  # This catches the case where a_generate_raw_response doesn't exist.
            if self.using_native_model:
                res, cost = await self.model.a_generate(prompt)
                self.evaluation_cost += cost
                data = trimAndLoadJson(res, self)
                return data["score"], data["reason"]
            else:
                try:
                    res: ReasonScore = await self.model.a_generate(
                        prompt, schema=ReasonScore
                    )
                    return res.score, res.reason
                except TypeError:
                    res = await self.model.a_generate(prompt)
                    data = trimAndLoadJson(res, self)
                    return data["score"], data["reason"]

    def _evaluate(
        self, test_case: ModelTestCase, _additional_context: Optional[str] = None
    ) -> Tuple[Union[int, float], str]:
        test_case_content = construct_test_case_string(
            self.evaluation_params, test_case
        )
        g_eval_params_str = construct_g_eval_params_string(
            self.evaluation_params
        )

        if not self.strict_mode:
            rubric_str = format_rubrics(self.rubric) if self.rubric else None
            prompt = GEvalTemplate.generate_evaluation_results(
                evaluation_steps=number_evaluation_steps(self.evaluation_steps),
                test_case_content=test_case_content,
                parameters=g_eval_params_str,
                rubric=rubric_str,
                score_range=get_score_range(self.rubric),
                _additional_context=_additional_context,
            )
        else:
            prompt = GEvalTemplate.generate_strict_evaluation_results(
                evaluation_steps=number_evaluation_steps(self.evaluation_steps),
                test_case_content=test_case_content,
                parameters=g_eval_params_str,
                _additional_context=_additional_context,
            )

        try:
            # don't use log probabilities for unsupported gpt models
            if no_log_prob_support(self.model):
                raise AttributeError("log_probs unsupported.")

            res, cost = self.model.generate_raw_response(
                prompt, top_logprobs=self.top_logprobs
            )
            self.evaluation_cost += cost
            data = trimAndLoadJson(res.choices[0].message.content, self)

            reason = data["reason"]
            score = data["score"]
            if self.strict_mode:
                return score, reason

            try:
                weighted_summed_score = calculate_weighted_summed_score(
                    score, res
                )
                return weighted_summed_score, reason
            except:
                return score, reason
        except AttributeError:
            # This catches the case where a_generate_raw_response doesn't exist.
            if self.using_native_model:
                res, cost = self.model.generate(prompt)
                self.evaluation_cost += cost
                data = trimAndLoadJson(res, self)
                return data["score"], data["reason"]
            else:
                try:
                    res: ReasonScore = self.model.generate(
                        prompt, schema=ReasonScore
                    )
                    return res.score, res.reason
                except TypeError:
                    res = self.model.generate(prompt)
                    data = trimAndLoadJson(res, self)
                    return data["score"], data["reason"]

    def is_successful(self) -> bool:
        if self.error is not None:
            self.success = False
        else:
            try:
                self.score >= self.threshold
            except:
                self.success = False
        return self.success

    @property
    def __name__(self):
        if self._include_g_eval_suffix:
            return f"{self.name} (GEval)"
        else:
            return self.name
