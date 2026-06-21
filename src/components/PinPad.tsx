import { Delete } from 'lucide-react'

interface PinPadProps {
  value: string
  onChange: (next: string) => void
  shake?: boolean
  disabled?: boolean
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']

export default function PinPad({ value, onChange, shake, disabled }: PinPadProps) {
  function press(k: string) {
    if (disabled) return
    if (k === 'del') return onChange(value.slice(0, -1))
    if (k === '') return
    if (value.length >= 4) return
    onChange(value + k)
  }

  return (
    <div className="flex flex-col items-center">
      {/* Dots */}
      <div className={`mb-8 flex gap-4 ${shake ? 'animate-[wiggle_0.4s]' : ''}`}>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-4 w-4 rounded-full border-2 transition ${
              i < value.length
                ? 'border-lavender bg-lavender'
                : 'border-lilac bg-transparent'
            }`}
          />
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((k, i) =>
          k === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => press(k)}
              disabled={disabled}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-white/80 text-2xl font-semibold text-ink shadow-card transition active:scale-90 hover:bg-white disabled:opacity-40 sm:h-[68px] sm:w-[68px]"
            >
              {k === 'del' ? <Delete size={22} className="text-muted" /> : k}
            </button>
          ),
        )}
      </div>
    </div>
  )
}
