import { digitsOnly } from '../lib/validation'

/**
 * Fixed +91 prefix (not editable) + up to 10 digits for Indian mobile.
 */
export function PhoneInputIndia({
  id,
  value10,
  onChange10,
  disabled = false,
  placeholder = '9876543210',
  className = '',
  required = false,
}) {
  return (
    <div className={`phone-input-in ${className}`.trim()}>
      <span className="phone-input-in__prefix" aria-hidden="true">
        +91
      </span>
      <input
        id={id}
        className="input phone-input-in__field"
        type="text"
        inputMode="numeric"
        autoComplete="tel-national"
        maxLength={10}
        placeholder={placeholder}
        value={value10}
        onChange={(e) => onChange10(digitsOnly(e.target.value).slice(0, 10))}
        disabled={disabled}
        required={required}
        aria-label="10-digit mobile number (India)"
      />
    </div>
  )
}
