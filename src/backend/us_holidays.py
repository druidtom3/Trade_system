"""
US stock market holidays detection module
"""

from datetime import datetime, date, timedelta
import pandas as pd

class USMarketHolidays:
    def __init__(self):
        self.holidays_2019_2024 = {
            2019: {
                'new_year': date(2019, 1, 1),
                'mlk': date(2019, 1, 21),
                'presidents': date(2019, 2, 18),
                'good_friday': date(2019, 4, 19),
                'memorial': date(2019, 5, 27),
                'independence': date(2019, 7, 4),
                'labor': date(2019, 9, 2),
                'thanksgiving': date(2019, 11, 28),
                'christmas': date(2019, 12, 25)
            },
            2020: {
                'new_year': date(2020, 1, 1),
                'mlk': date(2020, 1, 20),
                'presidents': date(2020, 2, 17),
                'good_friday': date(2020, 4, 10),
                'memorial': date(2020, 5, 25),
                'independence': date(2020, 7, 3),
                'labor': date(2020, 9, 7),
                'thanksgiving': date(2020, 11, 26),
                'christmas': date(2020, 12, 25)
            },
            2021: {
                'new_year': date(2021, 1, 1),
                'mlk': date(2021, 1, 18),
                'presidents': date(2021, 2, 15),
                'good_friday': date(2021, 4, 2),
                'memorial': date(2021, 5, 31),
                'independence': date(2021, 7, 5),
                'labor': date(2021, 9, 6),
                'thanksgiving': date(2021, 11, 25),
                'christmas': date(2021, 12, 24)
            },
            2022: {
                'new_year': None,
                'mlk': date(2022, 1, 17),
                'presidents': date(2022, 2, 21),
                'good_friday': date(2022, 4, 15),
                'memorial': date(2022, 5, 30),
                'juneteenth': date(2022, 6, 20),
                'independence': date(2022, 7, 4),
                'labor': date(2022, 9, 5),
                'thanksgiving': date(2022, 11, 24),
                'christmas': date(2022, 12, 26)
            },
            2023: {
                'new_year': date(2023, 1, 2),
                'mlk': date(2023, 1, 16),
                'presidents': date(2023, 2, 20),
                'good_friday': date(2023, 4, 7),
                'memorial': date(2023, 5, 29),
                'juneteenth': date(2023, 6, 19),
                'independence': date(2023, 7, 4),
                'labor': date(2023, 9, 4),
                'thanksgiving': date(2023, 11, 23),
                'christmas': date(2023, 12, 25)
            },
            2024: {
                'new_year': date(2024, 1, 1),
                'mlk': date(2024, 1, 15),
                'presidents': date(2024, 2, 19),
                'good_friday': date(2024, 3, 29),
                'memorial': date(2024, 5, 27),
                'juneteenth': date(2024, 6, 19),
                'independence': date(2024, 7, 4),
                'labor': date(2024, 9, 2),
                'thanksgiving': date(2024, 11, 28),
                'christmas': date(2024, 12, 25)
            }
        }
        
        self.early_close_days = {
            2019: [date(2019, 7, 3), date(2019, 11, 29), date(2019, 12, 24)],
            2020: [date(2020, 11, 27), date(2020, 12, 24)],
            2021: [date(2021, 11, 26)],
            2022: [date(2022, 11, 25)],
            2023: [date(2023, 7, 3), date(2023, 11, 24)],
            2024: [date(2024, 7, 3), date(2024, 11, 29), date(2024, 12, 24)]
        }
    
    def is_holiday(self, check_date):
        """Check if given date is a US stock market holiday"""
        if isinstance(check_date, str):
            check_date = pd.to_datetime(check_date).date()
        elif isinstance(check_date, pd.Timestamp):
            check_date = check_date.date()
        elif isinstance(check_date, datetime):
            check_date = check_date.date()
            
        year = check_date.year
        if year not in self.holidays_2019_2024:
            return False
            
        holidays = [h for h in self.holidays_2019_2024[year].values() if h]
        return check_date in holidays
    
    def is_early_close(self, check_date):
        """Check if given date is an early close day (1:00 PM EST)"""
        if isinstance(check_date, str):
            check_date = pd.to_datetime(check_date).date()
        elif isinstance(check_date, pd.Timestamp):
            check_date = check_date.date()
        elif isinstance(check_date, datetime):
            check_date = check_date.date()
            
        year = check_date.year
        if year not in self.early_close_days:
            return False
            
        return check_date in self.early_close_days[year]
    
    def get_holiday_info(self, check_date):
        """Get complete holiday information for a given date"""
        is_holiday = self.is_holiday(check_date)
        is_early_close = self.is_early_close(check_date)
        
        if is_holiday:
            status = "market_closed"
        elif is_early_close:
            status = "early_close"
        else:
            status = "normal_trading"
            
        return {
            'is_holiday': is_holiday,
            'is_early_close': is_early_close,
            'status': status
        }
    
    def get_next_trading_day(self, current_date):
        """Get the next trading day after the given date"""
        if isinstance(current_date, str):
            current_date = pd.to_datetime(current_date).date()
        elif isinstance(current_date, pd.Timestamp):
            current_date = current_date.date()
        elif isinstance(current_date, datetime):
            current_date = current_date.date()
            
        next_day = current_date + timedelta(days=1)
        
        while self.is_holiday(next_day) or next_day.weekday() >= 5:
            next_day = next_day + timedelta(days=1)
            
        return next_day