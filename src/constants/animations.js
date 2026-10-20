// Shared framer-motion variants. Pages wrap their content in a `containerVariants`
// motion.div and each card/section uses `itemVariants` for the staggered entrance.

export const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

export const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } },
};

export const fadeVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const popVariants = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: { scale: 1, opacity: 1 },
};
