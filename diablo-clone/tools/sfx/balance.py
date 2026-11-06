# balance.py <loud.json> : the target loudness (dB through a phone speaker, the loudest 100 ms) of each
# sound by its role, and the gain that gets it there from what loudness.cjs measured. Prints JS maps.
import json,sys
T = {  # big blows and moments
 'boom':-16,'meteor':-16,'crit':-17,'kill':-18,'crack':-18,'death':-15,'levelUp':-17,'hurt':-17,'cry':-18,
 # landing hits
 'hit':-19,'block':-19,'clank':-19,'chain':-20,'barrel':-20,'thunk':-21,'zap':-21,'whoomp':-21,'thud':-25,
 # casts and swings (the frequent ones quieter)
 'fireball':-19,'frost':-19,'blink':-21,'bolt':-21,'boltHit':-21,'sizzle':-22,'missile':-23,'swing':-23,'heavySwing':-21,'twang':-22,'arrow':-23,
 # monster voices
 'growl':-23,'squeal':-21,'yelp':-21,'hiss':-22,'clatter':-21,'splat':-21,
 # rewards and the interface
 'portal':-20,'chest':-20,'stairs':-21,'streak':-22,'clink':-22,'gold':-23,'potion':-22,'pickup':-23,'tap':-25,
 'step':-32,'crackle':-38}
d=json.load(open(sys.argv[1])); rec={}; syn={}
for n,t in T.items():
  r=d.get(n)
  if not r: continue
  if 'rec' in r: rec[n]=round(min(1.5,max(0.05,r['rec']['gain']*10**((t-r['rec']['phone'])/20))),2)
  if 'synth' in r and 'rec' not in r: syn[n]=round(min(2.5,max(0.05,r['synth'].get('gain',1)*10**((t-r['synth']['phone'])/20))),2)
print('const SAMPLE_GAIN = '+json.dumps(rec).replace('"','').replace(',',', ').replace(':',': ')+';')
print('const SYNTH_GAIN = '+json.dumps(syn).replace('"','').replace(',',', ').replace(':',': ')+';')
