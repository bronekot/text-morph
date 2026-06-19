import { useId, useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

export default function TextMorph({
  as = 'span',
  children,
  className,
  style,
  variants,
  transition,
  ...props
}) {
  const uniqueId = useId();
  const shouldReduceMotion = useReducedMotion();
  const text = String(children);
  const Component = as;

  const characters = useMemo(() => {
    const charCounts = {};

    return text.split('').map((char) => {
      const lowerChar = char.toLowerCase();
      charCounts[lowerChar] = (charCounts[lowerChar] || 0) + 1;

      return {
        id: `${uniqueId}-${lowerChar}${charCounts[lowerChar]}`,
        label: char === ' ' ? '\u00A0' : char,
      };
    });
  }, [text, uniqueId]);

  const defaultVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const defaultTransition = {
    type: 'spring',
    stiffness: 280,
    damping: 18,
    mass: 0.3,
  };

  if (shouldReduceMotion) {
    return (
      <Component className={className} style={style} {...props}>
        {text}
      </Component>
    );
  }

  return (
    <Component className={className} style={style} aria-label={text} {...props}>
      <AnimatePresence mode="popLayout" initial={false}>
        {characters.map((character) => (
          <motion.span
            className="morph-character"
            key={character.id}
            layoutId={character.id}
            aria-hidden="true"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={variants || defaultVariants}
            transition={transition || defaultTransition}
          >
            {character.label}
          </motion.span>
        ))}
      </AnimatePresence>
    </Component>
  );
}
