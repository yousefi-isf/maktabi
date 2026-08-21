import { EyeIcon, EyeOffIcon } from "lucide-react"
import * as React from "react"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { cn } from "@/lib/utils"

function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "type">) {
  const [showPassword, setShowPassword] = React.useState(false)
  const hidePassword = React.useCallback(() => setShowPassword(false), [])

  return (
    <InputGroup data-slot="password-input" className={cn(className)}>
      <InputGroupInput
        {...props}
        type={showPassword ? "text" : "password"}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-xs"
          className="select-none touch-none"
          aria-label="Show password while holding"
          onPointerDown={(e) => {
            e.preventDefault()
            setShowPassword(true)
          }}
          onPointerUp={hidePassword}
          onPointerLeave={hidePassword}
          onPointerCancel={hidePassword}
          onContextMenu={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              setShowPassword(true)
            }
          }}
          onKeyUp={hidePassword}
          onBlur={hidePassword}

        >
          {!showPassword ? <EyeOffIcon /> : <EyeIcon />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}

export { PasswordInput }
