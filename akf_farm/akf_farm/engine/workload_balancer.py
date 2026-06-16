def assign_leaders(tasks, block_owner, leaders, initial_load=None):
    """Gán mỗi task cho 1 tổ trưởng: ưu tiên chủ block, còn lại chọn người tải thấp nhất.

    initial_load: dict {leader: tải đã có} để cân tải tính cả việc đã gán trước đó.
    """
    load = {l: 0.0 for l in leaders}
    if initial_load:
        for l, v in initial_load.items():
            if l in load:
                load[l] = float(v)
    result = {}
    for t in sorted(tasks, key=lambda x: -float(x.get("mandays", 0))):
        owner = block_owner.get(t["block"])
        if owner in load:
            pick = owner
        else:
            pick = min(load, key=lambda l: load[l])
        result[t["id"]] = pick
        load[pick] += float(t.get("mandays", 0)) or 1
    return result
