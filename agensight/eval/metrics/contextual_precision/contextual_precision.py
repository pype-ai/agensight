from typing import Optional, List, Type, Union

from agensight.eval.utils import get_or_create_event_loop, prettify_list
from agensight.eval.metrics.utils import (
    construct_verbose_logs,
    trimAndLoadJson,
    check_llm_test_case_params,
    initialize_model,
)
from agensight.eval.test_case import (
    ModelTestCase,
    ModelTestCaseParams,
    ConversationalTestCase,
)
from agensight.eval.metrics import BaseMetric
from agensight.eval.models import DeepEvalBaseLLM
from agensight.eval.metrics.contextual_precision.template import (
    ContextualPrecisionTemplate,
)
from agensight.eval.metrics.indicator import metric_progress_indicator
from agensight.eval.metrics.contextual_precision.schema import *


class ContextualPrecisionMetric(BaseMetric):
    _required_params: List[ModelTestCaseParams] = [
        ModelTestCaseParams.INPUT,
        ModelTestCaseParams.ACTUAL_OUTPUT,
        ModelTestCaseParams.RETRIEVAL_CONTEXT,
                ]

    def __init__(
        self,
        threshold: float = 0.5,
        name: Optional[str] = None,
        model: Optional[Union[str, DeepEvalBaseLLM]] = None,
        include_reason: bool = True,
        async_mode: bool = False,
        strict_mode: bool = False,
        verbose_mode: bool = False,
        retrieval_context: Optional[List[str]] = None,
        evaluation_template: Type[
            ContextualPrecisionTemplate
        ] = ContextualPrecisionTemplate,

    ):  
        self.name = name
        
        # Convert threshold to float
        if isinstance(threshold, str):
            self.threshold = float(threshold)
        else:
            self.threshold = float(threshold) if threshold is not None else 0.5
        
        # Convert all boolean parameters properly
        self.include_reason = self._convert_to_bool(include_reason)
        self.async_mode = self._convert_to_bool(async_mode)
        self.strict_mode = self._convert_to_bool(strict_mode)
        self.verbose_mode = self._convert_to_bool(verbose_mode)
        
        self.model, self.using_native_model = initialize_model(model)
        self.evaluation_model = self.model.get_model_name()
        self.evaluation_template = evaluation_template
        self.retrieval_context = retrieval_context

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
    ) -> float:
        if isinstance(test_case, ConversationalTestCase):
            test_case = test_case.turns[-1]
        
        check_llm_test_case_params(test_case, self._required_params, self)
        print("self.async_mode", self.async_mode)
        self.evaluation_cost = 0 if self.using_native_model else None
        with metric_progress_indicator(
            self, _show_indicator=_show_indicator, _in_component=_in_component
        ):
            if self.async_mode:
                try:
                    loop = get_or_create_event_loop()
                    loop.run_until_complete(
                        self.a_measure(test_case, _show_indicator=False, _in_component=_in_component,)
                    )
                except RuntimeError as e:
                    if "interpreter shutdown" in str(e) or "event loop" in str(e):
                        # Fallback to sync mode during shutdown
                        self.async_mode = False
                        return self.measure(test_case, _show_indicator, _in_component)
                    else:
                        raise
            else:
                self.verdicts: List[ContextualPrecisionVerdict] = (
                    self._generate_verdicts(
                        test_case.input,
                        test_case.expected_output,
                        test_case.retrieval_context if self.retrieval_context is None else self.retrieval_context,
                    )
                )
                self.score = self._calculate_score()
                self.reason = self._generate_reason(test_case.input)
                self.success = self.score >= self.threshold
                self.verbose_logs = construct_verbose_logs(
                    self,
                    steps=[
                        f"Verdicts:\n{prettify_list(self.verdicts)}",
                        f"Score: {self.score}\nReason: {self.reason}",
                    ],
                )

            return self.score

    async def a_measure(
        self,
        test_case: Union[ModelTestCase, ConversationalTestCase],
        _show_indicator: bool = True,
        _in_component: bool = False,
    ) -> float:
        if isinstance(test_case, ConversationalTestCase):
            test_case = test_case.turns[-1]
        check_llm_test_case_params(test_case, self._required_params, self)

        self.evaluation_cost = 0 if self.using_native_model else None
        with metric_progress_indicator(
            self,
            async_mode=True,
            _show_indicator=_show_indicator,
            _in_component=_in_component,
        ):
            self.verdicts: List[ContextualPrecisionVerdict] = (
                await self._a_generate_verdicts(
                    test_case.input,
                    test_case.expected_output,
                    test_case.retrieval_context if self.retrieval_context is None else self.retrieval_context,
                )
            )
            self.score = self._calculate_score()
            self.reason = await self._a_generate_reason(test_case.input)
            self.success = self.score >= self.threshold
            self.verbose_logs = construct_verbose_logs(
                self,
                steps=[
                    f"Verdicts:\n{prettify_list(self.verdicts)}",
                    f"Score: {self.score}\nReason: {self.reason}",
                ],
            )

            return self.score

    async def _a_generate_reason(self, input: str):
        if self.include_reason is False:
            return None

        retrieval_contexts_verdicts = [
            {"verdict": verdict.verdict, "reasons": verdict.reason}
            for verdict in self.verdicts
        ]
        prompt = self.evaluation_template.generate_reason(
            input=input,
            verdicts=retrieval_contexts_verdicts,
            score=format(self.score, ".2f"),
        )

        if self.using_native_model:
            res, cost = await self.model.a_generate(prompt, schema=Reason)
            self.evaluation_cost += cost
            return res.reason
        else:
            try:
                res: Reason = await self.model.a_generate(prompt, schema=Reason)
                return res.reason
            except TypeError:
                res = await self.model.a_generate(prompt)
                data = trimAndLoadJson(res, self)
                return data["reason"]

    def _generate_reason(self, input: str):
        if self.include_reason is False:
            return None

        retrieval_contexts_verdicts = [
            {"verdict": verdict.verdict, "reasons": verdict.reason}
            for verdict in self.verdicts
        ]
        prompt = self.evaluation_template.generate_reason(
            input=input,
            verdicts=retrieval_contexts_verdicts,
            score=format(self.score, ".2f"),
        )

        if self.using_native_model:
            res, cost = self.model.generate(prompt, schema=Reason)
            self.evaluation_cost += cost
            return res.reason
        else:
            try:
                res: Reason = self.model.generate(prompt, schema=Reason)
                return res.reason
            except TypeError:
                res = self.model.generate(prompt)
                data = trimAndLoadJson(res, self)
                return data["reason"]

    async def _a_generate_verdicts(
        self, input: str, expected_output: str, retrieval_context: List[str]
    ) -> List[ContextualPrecisionVerdict]:
        prompt = self.evaluation_template.generate_verdicts(
            input=input,
            expected_output=expected_output,
            retrieval_context=retrieval_context,
        )
        if self.using_native_model:
            res, cost = await self.model.a_generate(prompt, schema=Verdicts)
            self.evaluation_cost += cost
            verdicts = [item for item in res.verdicts]
            return verdicts
        else:
            try:
                res: Verdicts = await self.model.a_generate(
                    prompt, schema=Verdicts
                )
                verdicts = [item for item in res.verdicts]
                return verdicts
            except TypeError:
                res = await self.model.a_generate(prompt)
                data = trimAndLoadJson(res, self)
                verdicts = [
                    ContextualPrecisionVerdict(**item)
                    for item in data["verdicts"]
                ]
                return verdicts

    def _generate_verdicts(
        self, input: str, expected_output: str, retrieval_context: List[str]
    ) -> List[ContextualPrecisionVerdict]:
        prompt = self.evaluation_template.generate_verdicts(
            input=input,
            expected_output=expected_output,
            retrieval_context=retrieval_context,
        )
        if self.using_native_model:
            res, cost = self.model.generate(prompt, schema=Verdicts)
            self.evaluation_cost += cost
            verdicts = [item for item in res.verdicts]
            return verdicts
        else:
            try:
                res: Verdicts = self.model.generate(prompt, schema=Verdicts)
                verdicts = [item for item in res.verdicts]
                return verdicts
            except TypeError:
                res = self.model.generate(prompt)
                data = trimAndLoadJson(res, self)
                verdicts = [
                    ContextualPrecisionVerdict(**item)
                    for item in data["verdicts"]
                ]
                return verdicts

    def _calculate_score(self):
        number_of_verdicts = len(self.verdicts)
        if number_of_verdicts == 0:
            return 0

        # Convert verdicts to a binary list where 'yes' is 1 and others are 0
        node_verdicts = [
            1 if v.verdict.strip().lower() == "yes" else 0
            for v in self.verdicts
        ]

        sum_weighted_precision_at_k = 0.0
        relevant_nodes_count = 0
        for k, is_relevant in enumerate(node_verdicts, start=1):
            # If the item is relevant, update the counter and add the weighted precision at k to the sum
            if is_relevant:
                relevant_nodes_count += 1
                precision_at_k = relevant_nodes_count / k
                sum_weighted_precision_at_k += precision_at_k * is_relevant

        if relevant_nodes_count == 0:
            return 0
        # Calculate weighted cumulative precision
        score = sum_weighted_precision_at_k / relevant_nodes_count
        return 0 if self.strict_mode and score < self.threshold else score

    def is_successful(self) -> bool:
        if self.error is not None:
            self.success = False
        else:
            try:
                self.success = self.score >= self.threshold
            except:
                self.success = False
        return self.success

    @property
    def __name__(self):
        return "Contextual Precision"
