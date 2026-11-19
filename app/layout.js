// app/layout.js
export const metadata = {
  title: 'Оформление Аренды | MusicMarket',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <head>
        {/* Подключаем Tailwind через CDN для быстрой работы (позже можно установить локально) */}
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="bg-gray-100 text-gray-800">
        {children}
      </body>
    </html>
  )
}