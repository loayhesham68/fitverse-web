import { createContext, useContext, useState } from 'react'

const TypingContext = createContext(null)

export function TypingProvider({ children }) {
  const [isTyping, setIsTyping] = useState(false)
  return (
    <TypingContext.Provider value={{ isTyping, setIsTyping }}>
      {children}
    </TypingContext.Provider>
  )
}

export function useTyping() {
  return useContext(TypingContext)
}