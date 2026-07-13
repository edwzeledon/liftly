'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { makeVariants } from './motionVariants';
import { HERO_BLUR } from './heroBlur';

// Layers 2-5 are photo treatment / legibility scrims — the app's only sanctioned gradients (spec exemption).
export default function PhotoBackdrop({ deepen = false }) {
  const reduce = useReducedMotion();
  const v = makeVariants(reduce);
  return (
    <motion.div className="absolute inset-0 overflow-hidden" aria-hidden="true"
      initial="hidden" animate="visible" variants={v.photo}>
      <Image src="/landing/hero-lifter.webp" alt="" fill priority sizes="100vw"
        placeholder="blur" blurDataURL={HERO_BLUR}
        className="object-cover object-[70%_center] md:object-center grayscale contrast-125 brightness-[.55]" />
      <div className="absolute inset-0 bg-training mix-blend-color opacity-60" />
      <div className="absolute inset-0 bg-protein mix-blend-soft-light opacity-25" />
      <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-background via-background/75 via-40% to-background/10" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
      <div className={`absolute inset-0 bg-background/60 transition-opacity duration-300 ${deepen ? 'opacity-100' : 'opacity-0'}`} />
    </motion.div>
  );
}
