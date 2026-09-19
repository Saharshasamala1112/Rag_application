import { createBrowserRouter } from 'react-router-dom'
import { App } from '../App'
import { Chat } from '../pages/Chat'
import { NotFound } from '../pages/NotFound'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <Chat />,
      },
      {
        path: 'chat',
        element: <Chat />,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
])
