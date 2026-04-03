"use client";

import { motion } from "framer-motion";

const messages = [
    "analyzing your test",
    "calculating metrics",
    "reviewing accuracy",
    "computing consistency",
];

export function AnalysisLoader() {
    const messageIndex = Math.floor(Math.random() * messages.length);
    const currentMessage = messages[messageIndex];
    const characters = currentMessage.split("");

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.04,
                delayChildren: 0.2,
            },
        },
    };

    const characterVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.3,
                ease: "easeOut",
            },
        },
    };

    return (
        <div className="w-full max-w-5xl mx-auto flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-9">
                {/* Animated text pulse loader */}
                <motion.div
                    className="text-center space-y-6"
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                >
                    <motion.div
                        className="flex justify-center flex-wrap gap-1 max-w-md"
                        variants={{
                            visible: {
                                transition: {
                                    staggerChildren: 0.04,
                                },
                            },
                        }}
                    >
                        {characters.map((char, i) => (
                            <motion.span
                                key={i}
                                className="font-mono text-2xl font-bold text-brand"
                                variants={characterVariants}
                            >
                                {char === " " ? "\u00A0" : char}
                            </motion.span>
                        ))}
                    </motion.div>

                    {/* Animated cursor/pulse line */}
                    <motion.div
                        className="flex justify-center gap-1"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{
                            duration: 1.2,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                    >
                        <span className="text-brand text-xl">▌</span>
                    </motion.div>
                </motion.div>

                {/* Subtle progress indicator */}
                <div className="w-40 h-1 bg-surface-border/40 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-transparent via-brand to-transparent"
                        animate={{ x: [-160, 320] }}
                        transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
