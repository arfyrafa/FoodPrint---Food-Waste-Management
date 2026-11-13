import { ORDER_STATUS_LABEL, type OrderStatus } from '../lib/types'
import { Badge } from './ui'

const TONE: Record<OrderStatus, 'warn' | 'good' | 'default' | 'danger'> = {
  pending: 'warn',
  confirmed: 'good',
  picked_up: 'default',
  cancelled: 'danger',
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={TONE[status]}>{ORDER_STATUS_LABEL[status]}</Badge>
}
