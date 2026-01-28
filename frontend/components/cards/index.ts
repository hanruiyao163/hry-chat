/**
 * 自定义组件卡片注册
 * 后期扩展：在 Markdown 中嵌入可交互的 React 组件
 */

// 卡片组件注册表（后续扩展）
export const cardRegistry: Record<string, React.ComponentType<any>> = {
  // weather: WeatherCard,
  // chart: ChartCard,
  // table: DataTableCard,
};

// 检查是否有对应的卡片组件
export function hasCard(type: string): boolean {
  return type in cardRegistry;
}

// 获取卡片组件
export function getCard(type: string): React.ComponentType<any> | undefined {
  return cardRegistry[type];
}
