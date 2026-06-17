import re


def parse_frequency(text: str):
    """Trả (frequency_type, value, times). value=số ngày chu kỳ (Y), times=số lần (X). Mặc định one_time."""
    t = (text or "").strip().lower()
    if "chu kỳ" in t or "1 lần/chu" in t:
        return ("one_time", 1, 1)
    if "hàng ngày" in t:
        return ("daily", 1, 1)
    m = re.search(r"(\d+)\s*lần\s*/\s*ngày", t)
    if m:
        return ("n_per_period", 1, int(m.group(1)))
    # "N lần/M năm" -> mỗi M*365 ngày (vd "1 lần/20 năm" -> 7300)
    m = re.search(r"\d+\s*lần\s*/\s*(\d+)\s*năm", t)
    if m:
        return ("n_per_period", int(m.group(1)) * 365, 1)
    # "N năm/lần"
    m = re.search(r"(\d+)\s*năm\s*/\s*lần", t)
    if m:
        return ("n_per_period", int(m.group(1)) * 365, 1)
    # "N ngày/lần"
    m = re.search(r"(\d+)\s*ngày\s*/\s*lần", t)
    if m:
        n = int(m.group(1))
        return ("daily", 1, 1) if n == 1 else ("n_per_period", n, 1)
    return ("one_time", 1, 1)
