import { useState } from "react";
import { motion } from "framer-motion";

const letters = "DECODED".split("");

type DecodeLogoProps = {
  className?: string;
  textClassName?: string;
  fullSize?: boolean;
  loopOnHover?: boolean;
};

const DecodeLogo = ({
  className = "",
  textClassName = "",
  fullSize = false,
  loopOnHover = true,
}: DecodeLogoProps) => {
  const [cycle, setCycle] = useState(0);

  const retrigger = () => setCycle((value) => value + 1);

  const textSizeClass = fullSize ? "text-xl md:text-[100px]" : "text-lg md:text-xl";
  const containerAlignmentClass = fullSize ? "justify-center w-full text-center" : "justify-left";

  return (
    <div
      className={`relative flex items-center bg-black cursor-pointer ${containerAlignmentClass} ${className}`}
      onMouseEnter={loopOnHover ? retrigger : undefined}
      onClick={retrigger}
    >
      <motion.div
        key={cycle}
        className={`${textSizeClass} font-bold tracking-wider text-white ${textClassName}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {letters.map((letter, i) => (
          <motion.span
            key={`${cycle}-${i}`}
            initial={{ opacity: 0, x: -10, filter: "blur(8px)" }}
            animate={{
              opacity: 1,
              x: 0,
              filter: "blur(0px)",
              color: [
                "#ffffff",
                i % 3 === 0 ? "#00ffff" : i % 3 === 1 ? "#ff00ff" : "#00ff9f",
                "#ffffff",
              ],
            }}
            transition={{
              delay: i * 0.15,
              duration: 0.6,
              // repeat: 1,
              // repeatDelay: 0.8,
            }}
            className="inline-block"
          >
            {letter}
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
};

export default DecodeLogo;