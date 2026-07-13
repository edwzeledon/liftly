import React from 'react';
import { cn } from "@/lib/utils";
import { motion } from 'framer-motion';

// Icon component for contact details
const InfoIcon = ({ type }) => {
    const icons = {
        website: (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-training-text">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" x2="22" y1="12" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
        ),
        phone: (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-training-text">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
        ),
        address: (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-training-text">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                <circle cx="12" cy="10" r="3"></circle>
            </svg>
        ),
    };
    return <div className="mr-2 shrink-0">{icons[type]}</div>;
};

const HeroSection = React.forwardRef(
  ({ className, logo, slogan, title, subtitle, callToAction, backgroundImage, contactInfo, onCtaClick, children, ...props }, ref) => {
    
    // Animation variants for the container to orchestrate children animations
    const containerVariants = {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: 0.15,
          delayChildren: 0.2,
        },
      },
    };

    // Animation variants for individual text/UI elements
    const itemVariants = {
      hidden: { y: 20, opacity: 0 },
      visible: {
        y: 0,
        opacity: 1,
        transition: {
          duration: 0.5,
          ease: "easeInOut",
        },
      },
    };
    
    return (
      <motion.section
        ref={ref}
        className={cn(
          "relative flex w-full flex-col overflow-hidden bg-card text-foreground md:flex-row min-h-screen",
          className
        )}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        {...props}
      >
        {/* Left Side: Content */}
        <div className="grow flex w-full flex-col justify-center p-8 md:w-1/2 md:p-12 lg:w-3/5 lg:p-16 z-10">
            {/* Top Section: Logo & Main Content */}
            
            <motion.header className="mb-8" variants={itemVariants}>
                {logo && (
                    <div className="flex items-center justify-center md:justify-start">
                        <img src={logo.url} alt={logo.alt} className="mr-3 h-8" />
                        <div>
                            {logo.text && <p className="text-lg font-bold text-foreground">{logo.text}</p>}
                            {slogan && <p className="text-xs tracking-wider text-muted-foreground">{slogan}</p>}
                        </div>
                    </div>
                )}
            </motion.header>

            <motion.main variants={containerVariants} className="flex-1 flex flex-col justify-center items-center text-center md:items-start md:text-left w-full max-w-lg mx-auto md:mx-0">
                {children ? (
                    <motion.div 
                        key="auth-content"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="w-full"
                    >
                        {children}
                    </motion.div>
                ) : (
                    <motion.div
                        key="hero-content"
                        initial="hidden"
                        animate="visible"
                        variants={containerVariants}
                        className="w-full"
                    >
                        <motion.h1 className="text-4xl font-bold leading-tight text-foreground md:text-5xl" variants={itemVariants}>
                            {title}
                        </motion.h1>
                        <motion.div className="my-6 h-1 w-full md:w-20 bg-indigo-600" variants={itemVariants}></motion.div>
                        <motion.p className="mb-8 max-w-md text-base text-muted-foreground mx-auto md:mx-0" variants={itemVariants}>
                            {subtitle}
                        </motion.p>
                        <motion.button
                            onClick={onCtaClick}
                            className="text-lg font-bold tracking-widest text-training-text transition-colors hover:text-training-text/80 inline-flex items-center gap-2"
                            variants={itemVariants}
                        >
                            {callToAction.text}
                            <span aria-hidden="true">→</span>
                        </motion.button>
                    </motion.div>
                )}
            </motion.main>

            {/* Bottom Section: Footer Info */}
            {contactInfo && (
                <motion.footer className="mt-12 w-full" variants={itemVariants}>
                    <div className="grid grid-cols-1 gap-6 text-xs text-faint sm:grid-cols-3">
                        {contactInfo.website && (
                            <div className="flex items-center justify-center md:justify-start">
                                <InfoIcon type="website" />
                                <span>{contactInfo.website}</span>
                            </div>
                        )}
                        {contactInfo.phone && (
                            <div className="flex items-center justify-center md:justify-start">
                                <InfoIcon type="phone" />
                                <span>{contactInfo.phone}</span>
                            </div>
                        )}
                        {contactInfo.address && (
                            <div className="flex items-center justify-center md:justify-start">
                                <InfoIcon type="address" />
                                <span>{contactInfo.address}</span>
                            </div>
                        )}
                    </div>
                </motion.footer>
            )}
        </div>

        {/* Right Side: Image with Clip Path Animation */}
        <motion.div 
          className="hidden md:block w-full min-h-[300px] bg-cover bg-center md:w-1/2 md:min-h-full lg:w-2/5 absolute right-0 top-0 bottom-0 md:relative"
          style={{ 
            backgroundImage: `url(${backgroundImage})`,
          }}
          initial={{ clipPath: 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)' }}
          animate={{ clipPath: 'polygon(25% 0, 100% 0, 100% 100%, 0% 100%)' }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        >
        </motion.div>
      </motion.section>
    );
  }
);

HeroSection.displayName = "HeroSection";

export { HeroSection };
