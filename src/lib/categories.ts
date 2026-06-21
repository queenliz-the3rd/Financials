// Default spending categories with a pastel color and emoji each.
export interface CategoryMeta {
  name: string
  emoji: string
  color: string
}

export const EXPENSE_CATEGORIES: CategoryMeta[] = [
  { name: 'Groceries', emoji: '🛒', color: '#bfe9d6' },
  { name: 'Dining', emoji: '🍜', color: '#ffd6c9' },
  { name: 'Rent', emoji: '🏠', color: '#cdb4f6' },
  { name: 'Transport', emoji: '🚌', color: '#bcdcff' },
  { name: 'Shopping', emoji: '🛍️', color: '#ffc6dd' },
  { name: 'Health', emoji: '💊', color: '#b9e4d0' },
  { name: 'Fun', emoji: '🎉', color: '#ffe9b3' },
  { name: 'Bills', emoji: '🧾', color: '#d7c9ff' },
  { name: 'Travel', emoji: '✈️', color: '#a8d8ff' },
  { name: 'Other', emoji: '✨', color: '#e3dcef' },
]

export const INCOME_CATEGORIES: CategoryMeta[] = [
  { name: 'Salary', emoji: '💼', color: '#bfe9d6' },
  { name: 'Freelance', emoji: '💻', color: '#bcdcff' },
  { name: 'Gift', emoji: '🎁', color: '#ffc6dd' },
  { name: 'Refund', emoji: '↩️', color: '#ffe9b3' },
  { name: 'Other', emoji: '✨', color: '#e3dcef' },
]

const ALL = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]

export function categoryMeta(name: string): CategoryMeta {
  return (
    ALL.find((c) => c.name === name) ?? { name, emoji: '✨', color: '#e3dcef' }
  )
}

// Stable pastel palette for charts.
export const CHART_COLORS = [
  '#cdb4f6',
  '#bfe9d6',
  '#bcdcff',
  '#ffc6dd',
  '#ffe9b3',
  '#ffd6c9',
  '#d7c9ff',
  '#a8d8ff',
  '#b9e4d0',
  '#e3dcef',
]
