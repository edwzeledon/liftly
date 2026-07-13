// Single source for landing motion. reduce=true collapses everything to opacity-only.
export function makeVariants(reduce) {
  return {
    container: {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: reduce ? {} : { staggerChildren: 0.14, delayChildren: 0.2 } },
    },
    item: {
      hidden: reduce ? { opacity: 0 } : { y: 20, opacity: 0 },
      visible: { y: 0, opacity: 1, transition: { duration: reduce ? 0.2 : 0.45, ease: [0.22, 1, 0.36, 1] } },
    },
    photo: {
      hidden: reduce ? { opacity: 0 } : { scale: 1.06, opacity: 0 },
      visible: { scale: 1, opacity: 1, transition: { duration: reduce ? 0.3 : 1.2, ease: [0.22, 1, 0.36, 1] } },
    },
  };
}
