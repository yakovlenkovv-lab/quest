import { motion } from 'framer-motion';

interface FixedBottomButtonProps {
  onClick: () => void;
}

export default function FixedBottomButton({ onClick }: FixedBottomButtonProps) {
  return (
    <motion.div
      className="fixed-bottom"
      initial={{ opacity: 0, y: 24, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.95 }}
      transition={{
        type: 'spring',
        stiffness: 320,
        damping: 26,
      }}
    >
      <motion.button
        className="fixed-code-btn"
        onClick={onClick}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        type="button"
        aria-label="Ввести код"
      >
        <span className="fixed-code-btn-icon" aria-hidden="true">🔐</span>
        Ввести код
      </motion.button>
    </motion.div>
  );
}
