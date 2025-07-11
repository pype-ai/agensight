from abc import abstractmethod
from typing import Optional, Dict, List

from agensight.eval.test_case import (
    ModelTestCase,
    ConversationalTestCase,
    MLLMTestCase,
    ModelTestCaseParams,
)
from agensight.eval.models import DeepEvalBaseLLM


class BaseMetric:
    _required_params = List[ModelTestCaseParams]
    threshold: float
    score: Optional[float] = None
    score_breakdown: Dict = None
    reason: Optional[str] = None
    success: Optional[bool] = None
    evaluation_model: Optional[str] = None
    strict_mode: bool = False
    async_mode: bool = True
    verbose_mode: bool = True
    include_reason: bool = False
    error: Optional[str] = None
    evaluation_cost: Optional[float] = None
    verbose_logs: Optional[str] = None
    skipped = False
    model = Optional[DeepEvalBaseLLM]
    using_native_model = Optional[bool]
    retrieval_context = Optional[List[str]]

    @abstractmethod
    def measure(self, test_case: ModelTestCase, *args, **kwargs) -> float:
        raise NotImplementedError

    @abstractmethod
    async def a_measure(self, test_case: ModelTestCase, *args, **kwargs) -> float:
        raise NotImplementedError(
            f"Async execution for {self.__class__.__name__} not supported yet. Please set 'async_mode' to 'False'."
        )

    @abstractmethod
    def is_successful(self) -> bool:
        raise NotImplementedError

    @property
    def __name__(self):
        return "Base Metric"


class BaseConversationalMetric:
    threshold: float
    score: Optional[float] = None
    score_breakdown: Dict = None
    reason: Optional[str] = None
    success: Optional[bool] = None
    evaluation_model: Optional[str] = None
    strict_mode: bool = False
    async_mode: bool = True
    verbose_mode: bool = True
    include_reason: bool = False
    error: Optional[str] = None
    evaluation_cost: Optional[float] = None
    verbose_logs: Optional[str] = None
    skipped = False

    @abstractmethod
    def measure(
        self, test_case: ConversationalTestCase, *args, **kwargs
    ) -> float:
        raise NotImplementedError

    @abstractmethod
    async def a_measure(
        self, test_case: ConversationalTestCase, *args, **kwargs
    ) -> float:
        raise NotImplementedError(
            f"Async execution for {self.__class__.__name__} not supported yet. Please set 'async_mode' to 'False'."
        )

    @abstractmethod
    def is_successful(self) -> bool:
        raise NotImplementedError

    @property
    def __name__(self):
        return "Base Conversational Metric"


class BaseMultimodalMetric:
    score: Optional[float] = None
    score_breakdown: Dict = None
    reason: Optional[str] = None
    success: Optional[bool] = None
    evaluation_model: Optional[str] = None
    strict_mode: bool = False
    async_mode: bool = True
    verbose_mode: bool = True
    include_reason: bool = False
    error: Optional[str] = None
    evaluation_cost: Optional[float] = None
    verbose_logs: Optional[str] = None
    skipped = False

    @property
    def threshold(self) -> float:
        return self._threshold

    @threshold.setter
    def threshold(self, value: float):
        self._threshold = value

    @abstractmethod
    def measure(self, test_case: MLLMTestCase, *args, **kwargs) -> float:
        raise NotImplementedError

    @abstractmethod
    async def a_measure(
        self, test_case: MLLMTestCase, *args, **kwargs
    ) -> float:
        raise NotImplementedError(
            f"Async execution for {self.__class__.__name__} not supported yet. Please set 'async_mode' to 'False'."
        )

    @abstractmethod
    def is_successful(self) -> bool:
        raise NotImplementedError

    @property
    def __name__(self):
        return "Base Multimodal Metric"
