import re


def parse_frequency(text: str):
    """Trả (frequency_type, value). Mặc định an toàn = one_time."""
    t = (text or "").strip().lower()
    if "chu kỳ" in t or "1 lần/chu" in t:
        return ("one_time", 1)
    if "hàng ngày" in t:
        return ("daily", 1)
    # "N lần/ngày" -> nhiều lần trong ngày
    m = re.search(r"(\d+)\s*lần\s*/\s*ngày", t)
    if m:
        return ("n_per_day", int(m.group(1)))
    # "N lần/M năm" -> mỗi M*365 ngày (vd "1 lần/20 năm" -> 7300)
    m = re.search(r"\d+\s*lần\s*/\s*(\d+)\s*năm", t)
    if m:
        return ("every_n_days", int(m.group(1)) * 365)
    # "N năm/lần"
    m = re.search(r"(\d+)\s*năm\s*/\s*lần", t)
    if m:
        return ("every_n_days", int(m.group(1)) * 365)
    # "N ngày/lần"
    m = re.search(r"(\d+)\s*ngày\s*/\s*lần", t)
    if m:
        n = int(m.group(1))
        return ("daily", 1) if n == 1 else ("every_n_days", n)
    return ("one_time", 1)
