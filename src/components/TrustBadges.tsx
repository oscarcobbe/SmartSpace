import { Shield, Truck, Headphones, Award } from "lucide-react";

const badges = [
  {
    icon: Shield,
    title: "5-Star Installer",
    description: "Dublin's only 5-star Ring installer",
  },
  {
    icon: Truck,
    title: "Serving Leinster",
    description: "Professional installation across Leinster",
  },
  {
    icon: Headphones,
    title: "Expert Support",
    description: "Dedicated support team ready to help",
  },
  {
    icon: Award,
    title: "Award Winning",
    description: "Three Ireland SME Business Winner 2025",
  },
];

export default function TrustBadges() {
  return (
    <section className="py-16 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {badges.map((badge) => (
            <div key={badge.title} className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-50 text-brand-500 rounded-2xl mb-4">
                <badge.icon className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm mb-1">
                {badge.title}
              </h3>
              <p className="text-xs text-gray-500">{badge.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
