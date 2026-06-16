def compute_mandays(mandays_per_ha: float, area_m2: float) -> float:
    ha = (area_m2 or 0) / 10000.0
    return round((mandays_per_ha or 0) * ha, 2)
