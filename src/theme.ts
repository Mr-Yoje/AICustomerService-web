import type { ThemeConfig } from 'antd'

export const theme: ThemeConfig = {
  token: {
    colorPrimary: '#0f6b5c',
    colorWarning: '#b7791f',
    colorError: '#b8401a',
    colorSuccess: '#2f7d4f',
    colorBgLayout: '#f3efe6',
    colorBgContainer: '#fffdf8',
    colorBorder: '#d9d1bf',
    colorBorderSecondary: '#e7e1d3',
    colorText: '#10201d',
    colorTextSecondary: '#6f6a5e',
    borderRadius: 8,
    fontFamily: "'HarmonyOS Sans SC', 'PingFang SC', 'Microsoft YaHei UI', 'Microsoft YaHei', sans-serif",
  },
  components: {
    Table: { headerBg: '#f1ece0', rowHoverBg: '#f7f3ea' },
    Tabs: { itemSelectedColor: '#0f6b5c', inkBarColor: '#0f6b5c' },
    Timeline: { dotBg: '#fffdf8' },
  },
}
