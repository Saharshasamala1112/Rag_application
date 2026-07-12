import { createBrowserRouter } from 'react-router-dom'
import { App } from '../App'
import { Chat } from '../pages/Chat'

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
        path: '*',
        element: <Chat />,
      },
    ],
  },
])
