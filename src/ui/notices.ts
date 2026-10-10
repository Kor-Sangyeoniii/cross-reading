import { createContext, useContext } from 'react'
export interface NoticesContext {
  unreadRooms: string[]
  latestByRoom: Record<string, number>
  markRoomRead: (roomId: string, messageId: number) => void
  refresh: () => void
  unavailable: boolean
}
export const MessageNoticesContext = createContext<NoticesContext>({ unreadRooms: [], latestByRoom: {}, markRoomRead: () => {}, refresh: () => {}, unavailable: false })
export const useMessageNotices = () => useContext(MessageNoticesContext)
