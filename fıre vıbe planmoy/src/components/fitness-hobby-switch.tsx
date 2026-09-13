import { Dumbbell, Palette } from 'lucide-react'
import { useState } from 'react'

export function FitnessHobbySwitch() {
  const [lane, setLane] = useState<'spor' | 'hobi'>('spor')
  return <section className="fitness-hobby panel"><div><p className="eyebrow blue-label">Ayrı akışlar</p><h3>{lane === 'spor' ? 'Spor ve antrenman' : 'Hobiler ve üretim'}</h3><p>{lane === 'spor' ? 'Gym, koşu ve antrenman planlarını hobilerinden ayrı takip et.' : 'El sanatları, müzik ve öğrenme hedeflerini kendi ritminde tut.'}</p></div><div className="fitness-tabs"><button className={lane === 'spor' ? 'selected' : ''} onClick={() => setLane('spor')}><Dumbbell size={14} /> Spor</button><button className={lane === 'hobi' ? 'selected' : ''} onClick={() => setLane('hobi')}><Palette size={14} /> Hobiler</button></div><div className="fitness-lane-note">{lane === 'spor' ? 'Antrenman yoğunluğunu, dinlenme günlerini ve gym hedeflerini takvimindeki boşluklarla eşleştir.' : 'Yeni bir hobi seç, küçük bir hedef koy ve bölgesel keşif önerilerini bu alana bağla.'}</div></section>
}
