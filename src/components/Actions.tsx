import { motion } from 'framer-motion';

interface ActionsProps {
  label: string;
  icon?: string;
  onClick: () => void;
}

export default function Actions({ label, icon, onClick }: ActionsProps) {
  return (
    <motion.div
      className="action-wrap"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <motion.button
        className="action-btn"
        onClick={onClick}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        {icon && <span aria-hidden="true">{icon}</span>}
        {label}
      </motion.button>
    </motion.div>
  );
}
