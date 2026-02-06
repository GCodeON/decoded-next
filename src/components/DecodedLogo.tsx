import { useState } from "react";
import { motion } from "framer-motion";

const letters = "DECODED".split("");

const DecodeLogo = () => {
  const [cycle, setCycle] = useState(0);

  const retrigger = () => setCycle((value) => value + 1);

  return (
    <div
      className="relative flex justify-left items-center bg-black cursor-pointer"
      onMouseEnter={retrigger}
      onClick={retrigger}
    >
      <motion.div
        key={cycle}
        className="text-lg md:text-xl font-bold tracking-wider text-white"
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