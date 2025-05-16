from typing import List, Optional, Union
from abc import ABC, abstractmethod
from .test_case import ModelTestCase, ModelTestCaseParams

class BaseMetric(ABC):
    def __init__(
        self,
        threshold: float = 0.5,
        strict_mode: bool = False,
        verbose_mode: bool = False,
    ):
        self.threshold = threshold
        self.strict_mode = strict_mode
        self.verbose_mode = verbose_mode
        self.score = 0.0
        self.reason = ""
        self.success = False
        self.verbose_logs = ""
        self.evaluation_cost = None
        
    @abstractmethod
    def measure(self, test_case: ModelTestCase) -> float:
        """Measure the metric score based on the test case"""
        pass
    
    def is_successful(self) -> bool:
        """Returns whether the metric passed or failed based on threshold"""
        return self.score >= self.threshold 