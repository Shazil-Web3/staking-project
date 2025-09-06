"use client";

import { motion } from 'framer-motion';
import Link from 'next/link';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const productLinks = [
    { name: 'Home', href: '/', clickable: true },
    { name: 'About', href: '/about', clickable: true },
    { name: 'Dashboard', href: '/dashboard', clickable: true },
    { name: 'Roadmap', href: '/roadmap', clickable: true }
  ];

  const resourceLinks = [
    { name: 'FAQ', href: '#faq', clickable: true },
    { name: 'How Bonuses Work', href: '#', clickable: false },
    { name: 'Safety Tips', href: '#', clickable: false }
  ];

  const legalLinks = [
    { name: 'Terms', href: '#', clickable: false },
    { name: 'Privacy', href: '#', clickable: false },
    { name: 'Disclaimer', href: '#', clickable: false }
  ];

  return (
    <footer className="border-t border-border/20 bg-background/50 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
              ETH Staker
            </h3>
            <p className="text-muted-foreground text-sm">
              Fixed-term ETH staking with simple, predictable bonuses.
            </p>
          </motion.div>

          {/* Product Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              {productLinks.map((link) => (
                <li key={link.name}>
                  {link.clickable ? (
                    <Link
                      href={link.href}
                      className="text-muted-foreground hover:text-primary transition-colors text-sm"
                    >
                      {link.name}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground/50 text-sm cursor-not-allowed">
                      {link.name}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Resources Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2">
              {resourceLinks.map((link) => (
                <li key={link.name}>
                  {link.clickable ? (
                    <a
                      href={link.href}
                      className="text-muted-foreground hover:text-primary transition-colors text-sm"
                    >
                      {link.name}
                    </a>
                  ) : (
                    <span className="text-muted-foreground/50 text-sm cursor-not-allowed">
                      {link.name}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Legal Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.name}>
                  {link.clickable ? (
                    <a
                      href={link.href}
                      className="text-muted-foreground hover:text-primary transition-colors text-sm"
                    >
                      {link.name}
                    </a>
                  ) : (
                    <span className="text-muted-foreground/50 text-sm cursor-not-allowed">
                      {link.name}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Bottom Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="border-t border-border/20 mt-8 pt-8 text-center"
        >
          <p className="text-muted-foreground text-sm mb-2">
            © {currentYear} ETH Staker. All rights reserved.
          </p>
          <p className="text-muted-foreground text-xs">
            Bonuses are fixed per plan and paid at maturity. Early withdraw returns principal only.
          </p>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;
