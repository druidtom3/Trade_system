"""
Performance optimization configuration for candle continuity checking
"""

CONTINUITY_CONFIG = {
    "enable_vectorization": True,
    "batch_processing": True,
    "batch_size": 50000,
    "memory_limit_mb": 150,
    "use_numpy_optimization": True,
    "parallel_processing": False,
    "cache_results": True,
    "smart_truncation": {
        "enabled": True,
        "max_rows": 200000,
        "keep_recent": True
    },
    "logging": {
        "verbose": False,
        "performance_metrics": True,
        "memory_tracking": True
    }
}