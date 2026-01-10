import React from 'react';
import { FileText, Shield, Clock, Users, AlertTriangle } from 'lucide-react';

export default function Rules() {
  return (
    <div className="min-h-screen bg-hoops-bg text-white pt-24 pb-24 px-4 max-w-4xl mx-auto font-sans">
      
      <div className="text-center mb-12">
        <h1 className="text-5xl font-display font-bold uppercase italic text-white mb-2">
          Règlement du <span className="text-hoops-yellow">Tournoi</span>
        </h1>
        <div className="h-1 w-24 bg-hoops-primary mx-auto"></div>
      </div>

      <div className="space-y-8">
        
        {/* Section 1 */}
        <RuleSection 
            number="1" 
            title="Composition des équipes" 
            icon={<Users className="text-hoops-yellow" />}
        >
            <p>Chaque équipe peut inscrire un maximum de <strong>8 joueurs</strong> (5 titulaires + 3 remplaçants).</p>
        </RuleSection>

        {/* Section 2 */}
        <RuleSection 
            number="2" 
            title="Format du tournoi" 
            icon={<Clock className="text-hoops-primary" />}
        >
            <div className="space-y-4">
                <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                    <h4 className="font-bold text-hoops-yellow uppercase mb-2">Phases Qualificatives (Élimination directe)</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-300">
                        <li>2 mi-temps de 15 minutes (sans arrêt de chronomètre)</li>
                        <li>5 minutes de pause à la mi-temps</li>
                        <li>1 temps mort de 60 secondes par équipe et par mi-temps</li>
                    </ul>
                </div>
                <div className="bg-hoops-primary/10 p-4 rounded-lg border border-hoops-primary/30">
                    <h4 className="font-bold text-white uppercase mb-2">Grande Finale</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-300">
                        <li>4 quarts-temps de 8 minutes avec arrêt du chronomètre</li>
                        <li>2 minutes de pause entre les quarts, 5 minutes à la mi-temps</li>
                        <li>1 temps mort par équipe et par quart-temps</li>
                    </ul>
                </div>
            </div>
        </RuleSection>

        {/* Section 3 */}
        <RuleSection 
            number="3" 
            title="Remplacements" 
            icon={<div className="font-bold text-xl">🔄</div>}
        >
            <p>Les changements sont autorisés à la volée, uniquement lors d’une sortie de balle. À tout moment, <strong>5 joueurs maximum</strong> par équipe sur le terrain.</p>
        </RuleSection>

        {/* Section 4 */}
        <RuleSection 
            number="4" 
            title="Fautes" 
            icon={<Shield className="text-red-500" />}
        >
            <ul className="space-y-3">
                <li className="flex gap-3 items-start">
                    <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs font-bold uppercase mt-1">Équipe</span>
                    <span>À partir de 4 fautes collectives par mi-temps, chaque nouvelle faute donne lieu à 2 lancers francs.</span>
                </li>
                <li className="flex gap-3 items-start">
                    <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded text-xs font-bold uppercase mt-1">Individuel</span>
                    <span>Un joueur est exclu après 4 fautes personnelles.</span>
                </li>
            </ul>
        </RuleSection>

        {/* Section 5 */}
        <RuleSection 
            number="5" 
            title="Comportement & Discipline" 
            icon={<AlertTriangle className="text-orange-500" />}
        >
            <p className="border-l-4 border-red-600 pl-4 italic text-gray-300">
                "Toute faute anti-sportive, comportement dangereux, propos ou gestes déplacés entraînera l’exclusion définitive du tournoi."
            </p>
        </RuleSection>

        {/* Section 6 */}
        <RuleSection 
            number="6" 
            title="Égalité" 
            icon={<div className="font-bold text-xl">=</div>}
        >
            <p>En cas d’égalité, une prolongation de <strong>3 minutes</strong> sera jouée. Si l’égalité persiste, on poursuit par des prolongations de 4 minutes jusqu’à départage.</p>
        </RuleSection>

        {/* Section 7 */}
        <RuleSection 
            number="7" 
            title="Règles Générales" 
            icon={<FileText className="text-gray-400" />}
        >
            <p>Le tournoi applique les règles officielles <strong>FIBA</strong>, adaptées au contexte streetball.</p>
        </RuleSection>

      </div>
    </div>
  );
}

function RuleSection({ number, title, children, icon }: any) {
    return (
        <div className="glass-panel p-6 md:p-8 rounded-2xl flex gap-6 items-start">
            <div className="hidden md:flex flex-col items-center gap-2 min-w-[60px]">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-2xl">
                    {icon}
                </div>
                <span className="text-xs font-bold text-gray-600">ART. {number}</span>
            </div>
            <div className="flex-1">
                <h3 className="text-2xl font-display font-bold uppercase text-white mb-4 flex items-center gap-3">
                    <span className="md:hidden text-hoops-yellow">#{number}</span> {title}
                </h3>
                <div className="text-gray-300 leading-relaxed text-sm md:text-base">
                    {children}
                </div>
            </div>
        </div>
    )
}