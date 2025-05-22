from dataclasses import dataclass, field
from typing import List, Optional, Dict
from copy import deepcopy

from agensight.eval.test_case import ModelTestCase


@dataclass
class ConversationalTestCase:
    turns: List[ModelTestCase]
    chatbot_role: Optional[str] = None
    name: Optional[str] = field(default=None)
    additional_metadata: Optional[Dict] = None
    comments: Optional[str] = None
    _dataset_rank: Optional[int] = field(default=None, repr=False)
    _dataset_alias: Optional[str] = field(default=None, repr=False)
    _dataset_id: Optional[str] = field(default=None, repr=False)

    def __post_init__(self):
        if len(self.turns) == 0:
            raise TypeError("'turns' must not be empty")

        copied_turns = []
        for turn in self.turns:
            if not isinstance(turn, ModelTestCase):
                raise TypeError("'turns' must be a list of `ModelTestCase`s")
            copied_turns.append(deepcopy(turn))

        self.turns = copied_turns
