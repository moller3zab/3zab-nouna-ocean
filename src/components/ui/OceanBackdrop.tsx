export function OceanBackdrop() {
  const words=['3zab ♡ Nouna','our little universe','just us, always','3zab ♡ Nouna','under the same sky','a little more love','3zab ♡ Nouna','home, with you'];
  return <div className="ocean-backdrop" aria-hidden="true">
    {words.map((word,index)=><span key={index} style={{top:`${5+index*12}%`,left:index%2?'auto':`${2+index%3}%`,right:index%2?`${2+index%3}%`:'auto',transform:`rotate(${index%2?9:-10}deg)`}}>{word}<small>♡</small></span>)}
    {[0,1,2,3,4].map(index=><svg key={index} viewBox="0 0 100 140" style={{top:`${14+index*19}%`,left:index%2?'auto':'5%',right:index%2?'5%':'auto',transform:`rotate(${index%2?-8:8}deg)`}}><g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{index%2?<><path d="M25 126L29 44Q32 12 51 12Q72 14 75 44L78 126Z"/><path d="M32 44H72M33 54H70M45 54V79H59V54M41 126V104Q51 91 62 104V126"/><ellipse cx="34" cy="68" rx="3" ry="6"/><ellipse cx="69" cy="68" rx="3" ry="6"/></>:<><path d="M19 55Q4 39 17 22Q48-1 80 23Q96 42 79 56L68 63V95Q79 97 76 105Q50 97 24 105Q19 97 30 95V63Z"/><path d="M31 58Q42 50 47 61V76Q36 85 31 73ZM49 61Q59 50 68 59V74Q58 85 49 76Z"/><path d="M30 67H68M49 75Q28 108 49 120Q68 110 49 75ZM41 122V136M57 122V136"/><path d="M40 36Q50 32 60 36M39 44Q50 39 61 44"/></>}<circle cx="86" cy="13" r="5"/><circle cx="12" cy="116" r="3"/></g></svg>)}
  </div>;
}
