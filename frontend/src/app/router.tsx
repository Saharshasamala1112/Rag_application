import { createBrowserRouter } from 'react-router-dom'
import { Home } from '../pages/Home'
import { Upload } from '../pages/Upload'
import { Chat } from '../pages/Chat'
import { NotFound } from '../pages/NotFound'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/upload',
    element: <Upload />,
  },
  {
    path: '/chat',
    element: <Chat />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
])
