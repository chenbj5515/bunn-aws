import { motion } from "framer-motion"

export const SuccessMotion = () => {
    return (
        <motion.div
            key="added"
            className="relative"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
        >
            <svg
                className="overflow-visible"
                viewBox="0 0 64 64"
                height="20px"
                width="20px"
            >
                <motion.path
                    d="M 14 32 L 28 46 L 50 18"
                    fill="none"
                    stroke="green"
                    strokeWidth={6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                />
            </svg>
        </motion.div>
    )
}