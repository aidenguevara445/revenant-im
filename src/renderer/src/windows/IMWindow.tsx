import { useState, useRef, useEffect } from 'react'
import { useWindowManager } from '../desktop/useWindowManager'
import { play } from '../sound/synth'
import './IMWindow.css'

interface Message {
  id: string
  sender: string
  text: string
  timestamp: Date
}

interface BuddyWorkLog {
  contract?: string
  attempts: Array<{ attemptNum: number; output: string }>
  verdicts: Array<{ attemptNum: number; verdict: 'accept' | 'reject'; feedback?: string }>
}

interface IMWindowProps {
  /** The ID of this window (for detecting focus/flash). */
  windowId: string
  /** The buddy screen name (or "Main" for the main chat). */
  buddyName: string
  /** True if this is the Main chat window, false for a buddy work log. */
  isMain: boolean
}

function IMWindow({ windowId, buddyName, isMain }: IMWindowProps): React.JSX.Element {
  const wm = useWindowManager()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [workLog] = useState<BuddyWorkLog>({ attempts: [], verdicts: [] })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastFocusedRef = useRef(wm.activeId === windowId)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, workLog])

  // Detect when a new message arrives while window is unfocused
  useEffect(() => {
    const wasFocused = lastFocusedRef.current
    const isFocused = wm.activeId === windowId
    lastFocusedRef.current = isFocused

    if (!wasFocused && !isFocused && messages.length > 0) {
      // New message arrived while unfocused
      wm.setFlashing(windowId, true)
      play('message')
    }
  }, [messages, wm, windowId])

  // Clear flashing when window becomes focused
  useEffect(() => {
    if (wm.activeId === windowId) {
      wm.setFlashing(windowId, false)
    }
  }, [wm, wm.activeId, windowId])

  const handleSend = (): void => {
    if (input.trim() === '') return

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      sender: 'You',
      text: input,
      timestamp: new Date()
    }

    setMessages((prev) => [...prev, newMessage])
    setInput('')

    // Simulate typing + response (TODO: wire to orchestrator via IPC)
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      const response: Message = {
        id: `msg-${Date.now() + 1}`,
        sender: buddyName,
        text: `Echo from ${buddyName}: ${input}`,
        timestamp: new Date()
      }
      setMessages((prev) => [...prev, response])
    }, 1500)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="im-window">
      {isMain ? (
        <>
          {/* Main chat: messages + input */}
          <div className="im-messages">
            {messages.map((msg) => (
              <div key={msg.id} className="im-message">
                <div className="im-message-header">
                  <span className="im-message-sender">{msg.sender}</span>
                  <span className="im-message-time">{formatTime(msg.timestamp)}</span>
                </div>
                <div className="im-message-text">{renderMessageText(msg.text)}</div>
              </div>
            ))}
            {isTyping && (
              <div className="im-typing">
                <em>{buddyName} is typing...</em>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="im-input-area">
            <textarea
              className="im-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${buddyName}...`}
              rows={3}
            />
            <button className="im-send-btn" onClick={handleSend}>
              Send
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Buddy work log: contract, attempts, verdicts */}
          <div className="im-work-log">
            {workLog.contract && (
              <div className="im-work-section">
                <h3 className="im-work-heading">Contract</h3>
                <div className="im-work-content">{workLog.contract}</div>
              </div>
            )}

            {workLog.attempts.map((attempt) => {
              const verdict = workLog.verdicts.find((v) => v.attemptNum === attempt.attemptNum)
              return (
                <div key={attempt.attemptNum} className="im-work-section">
                  <h3 className="im-work-heading">Attempt {attempt.attemptNum}</h3>
                  <div className="im-work-content">{attempt.output}</div>
                  {verdict && (
                    <div className={`im-verdict im-verdict-${verdict.verdict}`}>
                      <strong>{verdict.verdict === 'accept' ? '✓ Accepted' : '✗ Rejected'}</strong>
                      {verdict.feedback && (
                        <div className="im-verdict-feedback">{verdict.feedback}</div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {workLog.attempts.length === 0 && !workLog.contract && (
              <div className="im-work-empty">
                <em>No work yet from {buddyName}.</em>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </>
      )}
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────

function formatTime(date: Date): string {
  const h = date.getHours()
  const m = date.getMinutes().toString().padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${m} ${ampm}`
}

/**
 * Render message text with basic Markdown support (code blocks, inline code, bold).
 * For simplicity, using a basic regex approach. In production, use a library like react-markdown.
 */
function renderMessageText(text: string): React.JSX.Element {
  // Split by code blocks (```...```)
  const parts: React.JSX.Element[] = []
  const codeBlockRegex = /```(\w+)?\n([\s\S]+?)```/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Text before code block
    if (match.index > lastIndex) {
      parts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex, match.index)}</span>)
    }
    // Code block
    const lang = match[1] || ''
    const code = match[2]
    parts.push(
      <pre key={`code-${match.index}`} className="im-code-block">
        {lang && <div className="im-code-lang">{lang}</div>}
        <code>{code}</code>
      </pre>
    )
    lastIndex = match.index + match[0].length
  }

  // Remaining text after last code block
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex)
    // Apply inline code (`...`) and bold (**...**)
    const inlineRendered = renderInline(remaining)
    parts.push(<span key={`text-${lastIndex}`}>{inlineRendered}</span>)
  }

  return <div className="im-message-rendered">{parts}</div>
}

function renderInline(text: string): React.JSX.Element {
  // Inline code: `...`
  const inlineCodeRegex = /`([^`]+)`/g
  const parts: (string | React.JSX.Element)[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = inlineCodeRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    parts.push(
      <code key={`inline-${match.index}`} className="im-inline-code">
        {match[1]}
      </code>
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  // Bold: **...**
  const boldParts: (string | React.JSX.Element)[] = []
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (typeof part === 'string') {
      const boldRegex = /\*\*([^*]+)\*\*/g
      let boldLastIndex = 0
      let boldMatch: RegExpExecArray | null
      while ((boldMatch = boldRegex.exec(part)) !== null) {
        if (boldMatch.index > boldLastIndex) {
          boldParts.push(part.slice(boldLastIndex, boldMatch.index))
        }
        boldParts.push(<strong key={`bold-${i}-${boldMatch.index}`}>{boldMatch[1]}</strong>)
        boldLastIndex = boldMatch.index + boldMatch[0].length
      }
      if (boldLastIndex < part.length) {
        boldParts.push(part.slice(boldLastIndex))
      }
    } else {
      boldParts.push(part)
    }
  }

  return <>{boldParts}</>
}

export default IMWindow
