export const CASE_STATUSES = ['待发起', '前置检查', '对话中', '人工接管中', '后置处理中', '已完成', '已归档']

export const CASE_STATUS_COLOR: Record<string, string> = {
  待发起: 'default',
  前置检查: 'blue',
  对话中: 'green',
  人工接管中: 'red',
  后置处理中: 'gold',
  已完成: 'cyan',
  已归档: 'default',
}

export const CHECKPOINTS = ['坐席话术', '运营操作', '客户输入', '前置检查', '人工接管', '记忆操作']
