import os
from typing import Optional

class Settings:
    # Database Configuration
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: str = os.getenv("DB_PORT", "5432")
    DB_USER: str = os.getenv("DB_USER", "prapti_user")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "prapti_pass")
    DB_NAME: str = os.getenv("DB_NAME", "prapti_db")
    
    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
    
    # Application Configuration
    APP_NAME: str = "Prapti - Receivables Aging Dashboard"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # API Configuration
    API_PREFIX: str = "/api"
    
    # CORS Configuration
    ALLOWED_ORIGINS: list = [
        "http://localhost:5001",
        "http://127.0.0.1:5001",
        "http://0.0.0.0:5001"
    ]
    
    # Pagination
    DEFAULT_PAGE_SIZE: int = 50
    MAX_PAGE_SIZE: int = 100
    
    # Date Format
    DATE_FORMAT: str = "%Y-%m-%d"
    DATETIME_FORMAT: str = "%Y-%m-%d %H:%M:%S"
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

# Create settings instance
settings = Settings()

# Environment-specific configurations
if os.getenv("ENVIRONMENT") == "production":
    settings.DEBUG = False
    settings.LOG_LEVEL = "WARNING"
elif os.getenv("ENVIRONMENT") == "development":
    settings.DEBUG = True
    settings.LOG_LEVEL = "DEBUG"

# Database connection validation
def validate_db_config():
    """Validate database configuration"""
    required_vars = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"]
    missing_vars = []
    
    for var in required_vars:
        if not getattr(settings, var):
            missing_vars.append(var)
    
    if missing_vars:
        raise ValueError(f"Missing required database configuration: {', '.join(missing_vars)}")
    
    return True

# Export for easy import
__all__ = ["settings", "validate_db_config"]