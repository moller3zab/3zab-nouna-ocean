import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export type CharacterMood = 'idle' | 'email' | 'password' | 'error' | 'success';

export const SanctuaryCharacter = memo(function SanctuaryCharacter({ mood, gaze }: { mood: CharacterMood; gaze: number }) {
  const covering = mood === 'password';
  const reducedMotion = useReducedMotion();
  const armTransition = { duration: reducedMotion ? 0 : .65, times: [0, .48, 1], ease: 'easeInOut' as const };
  const leftRest = 'M128 415Q104 480 110 550Q112 570 127 555L144 544Q128 545 130 508Q132 462 143 396Z';
  const leftMiddle = 'M128 415Q81 399 80 355Q78 319 108 299L122 318Q103 333 106 354Q104 383 143 396Z';
  const leftRaised = 'M128 415Q80 391 91 315Q96 246 137 174L150 190Q119 258 116 315Q111 365 143 396Z';
  const rightRest = 'M273 415Q297 480 291 550Q289 570 274 555L257 544Q273 545 271 508Q269 462 258 396Z';
  const rightMiddle = 'M273 415Q320 399 321 355Q323 319 293 299L279 318Q298 333 295 354Q297 383 258 396Z';
  const rightRaised = 'M273 415Q321 391 310 315Q305 246 263 174L250 190Q282 258 285 315Q290 365 258 396Z';
  const description = mood === 'password'
    ? 'Squidward covers both eyes with his hands'
    : mood === 'success' ? 'Squidward gives you a thumbs up' : 'Squidward stands facing you';

  return (
    <div className={`sanctuary-character mood-${mood}`} role="img" aria-label={description}>
      <svg viewBox="0 0 400 590" aria-hidden="true">
        <defs>
          <linearGradient id="guardian-skin" x1="0" y1="0" x2="1" y2=".7">
            <stop stopColor="#b6d5c8"/><stop offset=".55" stopColor="#a8cbbc"/><stop offset="1" stopColor="#91b9aa"/>
          </linearGradient>
          <linearGradient id="guardian-polo" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#b38b50"/><stop offset="1" stopColor="#795a34"/>
          </linearGradient>
        </defs>
        
        <g className="guardian-body" stroke="#183c3d" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round">
          <g transform="translate(0 115)">
          <g fill="url(#guardian-skin)">
            <path d="M163 337Q152 374 146 414Q128 417 121 430Q119 442 147 439Q166 438 168 419L185 345Z"/>
            <path d="M184 342L176 414Q166 425 170 435Q175 445 191 436Q202 429 199 413L203 343Z"/>
            <path d="M205 342L207 414Q201 432 215 438Q236 446 233 432L228 413L226 342Z"/>
            <path d="M224 341L240 419Q241 438 259 439Q284 443 279 430Q273 419 256 414L242 337Z"/>
          </g>
          <path d="M154 262Q132 264 119 290L139 308L146 297L144 346Q198 363 257 345L254 297L263 309L284 290Q274 270 249 262L228 254L175 254Z" fill="url(#guardian-polo)"/>
          <path d="M177 190L174 263L199 281L226 263L224 190" fill="url(#guardian-skin)"/>
          <path d="M174 261L164 270L184 293L199 281L215 293L237 270L226 261M199 282L199 312" fill="none" stroke="#59482f" strokeWidth="3"/>
          <circle cx="205" cy="299" r="1.6" fill="#e4c28e" stroke="none"/>
          </g>
          <g className="guardian-head">
            <path d="M74 135C46 101 61 52 108 29C153 6 244 6 290 31C339 57 353 103 324 137Q301 164 261 172L261 245Q286 248 290 267Q292 289 274 289Q237 276 200 279Q161 276 126 289Q107 290 108 269Q109 249 139 245L139 172Q97 162 74 135Z" fill="url(#guardian-skin)"/>
            <g fill="#558f88" stroke="none" opacity=".65"><ellipse cx="121" cy="53" rx="6" ry="3.5" transform="rotate(-28 121 53)"/><ellipse cx="155" cy="38" rx="6" ry="3"/><ellipse cx="201" cy="32" rx="6" ry="3"/><ellipse cx="248" cy="41" rx="6" ry="3" transform="rotate(15 248 41)"/><ellipse cx="282" cy="60" rx="5" ry="3" transform="rotate(35 282 60)"/></g>
            <path d="M218 69Q235 53 252 66M215 88Q237 70 254 86" fill="none" stroke="#294e43" strokeWidth="3"/>
            <g className="guardian-eyes-open">
              <path d="M139 139Q144 115 164 115L182 115Q195 132 197 161Q198 207 172 212Q145 209 141 178Z" fill="#f7e9ad"/>
              <path d="M203 161Q205 118 226 115Q250 112 260 140L259 178Q255 209 230 212Q203 207 203 161Z" fill="#f7e9ad"/>
              <g style={{ transform: `translate(${gaze}px, 0)` }} fill="#1a2723" stroke="none"><rect x="170" y="157" width="8" height="22" rx="3"/><rect x="222" y="157" width="8" height="22" rx="3"/></g>
              <path d="M139 139Q144 115 164 115L182 115Q193 131 196 157L139 157Z" fill="#9fc3b0"/>
              <path d="M204 157Q205 118 226 115Q250 112 260 140L261 157Z" fill="#9fc3b0"/>
              <path d="M138 157L195 157Q201 158 196 165L139 165Q132 164 138 157ZM204 157L261 157Q268 164 261 165L204 165Q199 164 204 157Z" fill="#a8cbbc" strokeWidth="2.5"/>
            </g>
            <g className="guardian-eyes-closed" fill="none"><path d="M148 158Q170 169 192 157M201 157Q223 169 244 158"/></g>
            <path d="M124 269Q162 253 200 260Q239 253 275 269M123 264L124 274M275 264L276 274" fill="none" strokeWidth="3"/>
            <path d="M200 173Q179 199 169 230Q153 271 174 297Q185 311 200 313Q217 311 228 297Q249 271 231 230Q221 199 200 173Z" fill="url(#guardian-skin)"/>
          </g>
          {/* Raised arms render in front of the face; both palms actually cover the eyes. */}
          <g className="guardian-moving-arms" fill="url(#guardian-skin)">
            <g className="guardian-cover-left">
              <motion.path initial={false} animate={{ d: covering ? [leftRest, leftMiddle, leftRaised] : [leftRaised, leftMiddle, leftRest] }} transition={armTransition}/>
              <motion.g initial={false} animate={{ x: covering ? [-45, -70, 0] : [0, -70, -45], y: covering ? [365, 145, 0] : [0, 145, 365], rotate: covering ? [-12, -25, 0] : [0, -25, -12] }} transition={armTransition} style={{ originX: .5, originY: .8 }}>
              <path d="M139 181Q130 166 137 150L146 132Q151 125 157 132L160 143L163 126Q166 119 173 123Q178 126 176 141L181 131Q187 125 192 132L190 150Q200 149 201 158L197 181Q190 199 173 200Q151 199 139 181Z"/>
              <path d="M157 143L154 162M176 141L173 162M190 150L186 167" fill="none" stroke="#518781" strokeWidth="2"/>
              </motion.g>
            </g>
            <g className="guardian-cover-right">
              <motion.path initial={false} animate={{ d: covering ? [rightRest, rightMiddle, rightRaised] : [rightRaised, rightMiddle, rightRest] }} transition={{ ...armTransition, delay: reducedMotion ? 0 : .06 }}/>
              <motion.g initial={false} animate={{ x: covering ? [45, 70, 0] : [0, 70, 45], y: covering ? [365, 145, 0] : [0, 145, 365], rotate: covering ? [12, 25, 0] : [0, 25, 12] }} transition={{ ...armTransition, delay: reducedMotion ? 0 : .06 }} style={{ originX: .5, originY: .8 }}>
              <path d="M261 181Q270 166 263 150L254 132Q249 125 243 132L240 143L237 126Q234 119 227 123Q222 126 224 141L219 131Q213 125 208 132L210 150Q200 149 199 158L203 181Q210 199 227 200Q249 199 261 181Z"/>
              <path d="M243 143L246 162M224 141L227 162M210 150L214 167" fill="none" stroke="#518781" strokeWidth="2"/>
              </motion.g>
            </g>
          </g>
          <g className="guardian-thumbs-up" fill="url(#guardian-skin)">
            <g transform="translate(0 115)">
            <path d="M268 294Q294 300 309 272L316 251L301 238Q286 258 276 261L262 280Z"/>
            <path d="M302 251Q291 243 297 231L307 213L309 190Q312 179 319 185Q326 191 323 213L338 215Q349 217 346 229L340 250Q338 259 327 260Z"/>
            <path d="M329 223L343 227M326 234L341 238M323 245L337 249" fill="none" stroke="#518781" strokeWidth="2"/>
            </g>
          </g>
        </g>
        <g className="guardian-hearts" fill="#b6e4ff"><path d="M307 109C288 91 285 119 307 130C329 117 327 92 307 109Z"/><path d="M80 214C66 200 63 221 80 229C96 220 95 201 80 214Z"/></g>
      </svg>
    </div>
  );
});
