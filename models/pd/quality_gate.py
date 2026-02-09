from pydantic import BaseModel, Field, conint
from pylon.core.tools import log


class QualityGate(BaseModel):
    """Quality Gate configuration for UI performance tests."""

    # Renamed field with backward compatibility
    deviation: conint(ge=-1, le=100) = Field(
        20,
        alias='degradation_rate',
        description="Acceptable deviation in test results, used for comparison with thresholds and baseline"
    )

    missed_thresholds: conint(ge=-1, le=100) = Field(
        50,
        description="Maximum percentage of thresholds that can fail before marking test as failed"
    )

    baseline_deviation: conint(ge=-1, le=100) = Field(
        -1,
        description="Maximum acceptable performance degradation from baseline; test fails if current results exceed this percentage"
    )

    class Config:
        allow_population_by_field_name = True  # Accept both old and new field names
