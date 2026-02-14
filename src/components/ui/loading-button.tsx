import React from 'react'
import { Button } from "@/components/ui/button"
import { Check } from 'lucide-react'
import { type VariantProps } from "class-variance-authority"
import { buttonVariants } from "@/components/ui/button"
import { motion, AnimatePresence } from 'framer-motion'

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
    isLoading?: boolean
    isSuccess?: boolean
    successText?: string
    backgroundColor?: 'black' | 'white'
    loaderColor?: 'black' | 'white'
}

function LoadingButton({ isLoading = false, isSuccess = false, successText, disabled, children, variant = "default", backgroundColor = "black", loaderColor = "black", className, ...props }: LoadingButtonProps) {
    const baseClassName = "flex justify-center items-center space-x-2 min-w-[120px]"
    const whiteBgClassName = "bg-white hover:bg-gray-100 shadow-neumorphic hover:shadow-neumorphic-button-hover text-black"

    let buttonClassName = baseClassName
    let buttonVariant = variant

    if (backgroundColor === "white") {
        buttonClassName = `${baseClassName} ${whiteBgClassName}`
        buttonVariant = "ghost" // 使用ghost variant来避免默认背景色干扰
    }

    // 合并传入的className
    const finalClassName = className ? `${buttonClassName} ${className}` : buttonClassName

    return (
        <Button
            variant={buttonVariant}
            disabled={disabled || isLoading || isSuccess}
            className={finalClassName}
            {...props}
        >
            <AnimatePresence mode="wait">
                {
                    isLoading && <span className={`mr-[6px] inline-block border-b-2 rounded-full w-4 h-4 animate-spin ${loaderColor === 'white' ? 'border-white' : 'border-black'}`}></span>
                }

                {isSuccess && (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.8, rotate: -180 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{
                            type: 'spring',
                            stiffness: 400,
                            damping: 17,
                            duration: 0.6
                        }}
                    >
                        <Check className="mr-[6px] w-4 h-4 text-green-600" />
                    </motion.div>
                )}
            </AnimatePresence>
            {isSuccess && successText ? successText : children}
        </Button>
    )
}

export { LoadingButton }
