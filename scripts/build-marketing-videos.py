from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json,subprocess,textwrap
ROOT=Path(__file__).resolve().parent.parent
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'; BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def font(n,bold=False):return ImageFont.truetype(BOLD if bold else FONT,n)
def wrapped(draw,value,f,width):
    out=[]
    for paragraph in value.split('\n'):
        line=''
        for word in paragraph.split():
            candidate=(line+' '+word).strip()
            if draw.textlength(candidate,font=f)>width and line:out.append(line);line=word
            else:line=candidate
        out.append(line)
        out.append('')
    return out[:-1]
def frame(title,body,index):
    im=Image.new('RGB',(720,1280),'#102b3b');d=ImageDraw.Draw(im)
    d.rounded_rectangle((40,44,680,100),radius=20,fill='#234458');d.text((62,59),'CareerLaunch AI',font=font(22,True),fill='#e2fff4')
    d.text((48,140),'YOUR FACTS. A CLEARER APPLICATION.',font=font(16,True),fill='#9cdfd2')
    y=195
    for line in wrapped(d,title,font(43,True),615):
        d.text((48,y),line,font=font(43,True),fill='white');y+=56
    y=max(y+25,395)
    lines=wrapped(d,body,font(29),560)
    if y+len(lines)*40>1040:raise ValueError('Caption exceeds safe area: '+title)
    d.rounded_rectangle((40,y-20,680,min(1090,y+len(lines)*40+28)),radius=22,fill='#e9f6f2')
    for line in lines:d.text((65,y),line,font=font(29),fill='#153b47');y+=40
    for n in range(5):d.rounded_rectangle((48+n*125,1130,158+n*125,1138),radius=4,fill='#a8e0cf' if n==index else '#355360')
    d.text((48,1170),'resumebuilder.shop',font=font(27,True),fill='white')
    d.text((48,1216),'Illustrative examples · Verify before applying',font=font(17),fill='#c7d8dd')
    return im
for video in json.loads((ROOT/'docs/marketing/video-storyboards.json').read_text()):
    directory=ROOT/'test-output/marketing'/video['slug'];directory.mkdir(parents=True,exist_ok=True)
    for i,(title,body) in enumerate(video['slides']):
        image=frame(title,body,i);image.save(directory/f'{i:02}.png')
        if i==0:image.save(ROOT/'media'/f'{video["slug"]}.jpg',quality=90)
    output=ROOT/'media'/f'{video["slug"]}.mp4'
    subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate','1/12','-i',str(directory/'%02d.png'),'-vf','fps=24,format=yuv420p','-c:v','libx264','-preset','fast','-crf','23','-movflags','+faststart','-an',str(output)],check=True)
    print(video['slug'],output.stat().st_size)
im=Image.new('RGB',(1200,630),'#102b3b');d=ImageDraw.Draw(im);d.text((70,60),'CareerLaunch AI',font=font(34,True),fill='#a8e0cf');d.text((70,170),'Your experience.',font=font(74,True),fill='white');d.text((70,270),'Clearly explained.',font=font(74,True),fill='white');d.text((70,420),'Federal • Private sector • Career change',font=font(30),fill='#d2e8e2');d.text((70,520),'resumebuilder.shop',font=font(32,True),fill='white');im.save(ROOT/'media/careerlaunch-share.png')
