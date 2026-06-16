def assign_leaders(tasks, block_owner, leaders):
    """Gán mỗi task cho 1 tổ trưởng: ưu tiên chủ block, còn lại chọn người tải thấp nhất."""
    load = {l: 0.0 for l in leaders}
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
