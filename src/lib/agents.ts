/** 注册表归属在界面上的名称。owner 取值与 GET /api/registry 的分组一致。 */
export function ownerLabel(owner: string): string {
  if (owner === 'main') return '主控 Agent'
  if (owner === 'ops') return '运营子 Agent'
  if (owner === 'collection') return '催收子 Agent'
  if (owner.startsWith('collection:')) return `催收子 Agent · ${owner.slice('collection:'.length)}`
  return owner
}

/** 这些轨迹步骤由运营子 Agent 写入，调用记录里不一定带 owner。 */
const OPS_STEPS = new Set([
  '检查点二：运营操作',
  '检查点二：外呼门禁',
  '检查点一：坐席话术审核',
  '检查点一：人工坐席话术',
])

export function handledByOps(trace: { name: string; detail?: Record<string, unknown> }[] | undefined): boolean {
  return (trace ?? []).some((e) => e.detail?.owner === 'ops' || OPS_STEPS.has(e.name))
}
