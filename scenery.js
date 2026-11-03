import * as THREE from 'three';

// Small environmental details use shared materials and instancing where practical.
export function decorateWorld({scene,box,sphere,cylinder,material}) {
  const gardenSpots=[[-8,-5],[-8,0],[-3,-6],[8,-6],[9,4],[-9,6]];
  const grassGeometry=new THREE.ConeGeometry(.045,.27,3);
  const grass=new THREE.InstancedMesh(grassGeometry,material('#72a946'),240);
  const dummy=new THREE.Object3D();
  for(let i=0;i<240;i++){
    const [x,z]=gardenSpots[i%gardenSpots.length],a=i*2.39996,r=.4+(i%17)/17*.95;
    dummy.position.set(x+Math.cos(a)*r,.52,z+Math.sin(a)*r);
    dummy.rotation.set(.1*Math.sin(i),a,.12*Math.cos(i));
    dummy.scale.setScalar(.65+(i%5)*.15);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);
  }
  scene.add(grass);
  for(let k=0;k<gardenSpots.length;k++){
    const [x,z]=gardenSpots[k];
    const bed=sphere(.9,'#75ab4d',x,.34,z);bed.scale.set(1,.12,.85);bed.receiveShadow=true;
    for(let i=0;i<4;i++){
      const a=i*2.4+k,r=.9;const fx=x+Math.cos(a)*r,fz=z+Math.sin(a)*r;
      cylinder(.018,.02,.22,'#538a40',fx,.57,fz);
      for(let j=0;j<5;j++){const angle=j*Math.PI*2/5;const petal=sphere(.066,['#fff1b3','#f2a39a','#fff7e5'][k%3],fx+Math.cos(angle)*.073,.71,fz+Math.sin(angle)*.073);petal.scale.y=.4;}
      sphere(.04,'#e6b54d',fx,.73,fz);
    }
  }
  // Cushions and glazed windows give the shop a softer, lived-in appearance.
  for(const x of [-1.3,-.2,.9,2]){
    const highlight=box(.65,.065,.015,'#d7efdb',x,2.4,.1);highlight.rotation.z=-.22;
  }
  for(const [x,z] of [[4.92,1.6],[7.08,1.6],[4.92,-3],[7.08,-3],[-3.88,5],[-1.72,5]]){
    box(.55,.09,.53,'#e2be80',x,.75,z);
  }
  // Wooden panelling and lanterns around the service counter.
  for(let i=0;i<11;i++)box(.018,.58,.025,'#c49b68',-1.95+i*.46,.95,.35);
  for(const x of [-2.45,3.4]){
    const globe=sphere(.14,'#ffdf91',x,2.48,.16);
    globe.material=new THREE.MeshStandardMaterial({color:'#ffdf91',emissive:'#e8aa42',emissiveIntensity:.3,roughness:.4});
    box(.06,.22,.08,'#836d47',x,2.65,.08);
  }
  // Clusters of smooth stones at the shore.
  for(let i=0;i<14;i++){
    const rock=sphere(.2+(i%3)*.06,['#b6baa5','#c9c6ae','#a6b4a1'][i%3],-10.15+(i%4)*.35,-.04,5.9+Math.floor(i/4)*.5);
    rock.scale.set(1.3,.65,1);rock.receiveShadow=true;
  }
  // Transparent wisps drift gently above the warm kitchen chimney.
  const steam=[];
  const steamMaterial=new THREE.MeshBasicMaterial({color:'#fff9e7',transparent:true,opacity:.28,depthWrite:false});
  const puffGeometry=new THREE.SphereGeometry(1,16,12);
  for(let i=0;i<4;i++){
    const puff=new THREE.Mesh(puffGeometry,steamMaterial.clone());scene.add(puff);steam.push(puff);
  }
  const cloud=new THREE.Group();
  for(let i=0;i<5;i++){const p=sphere(.75,'#f5f6dd',-8+i*.6,5.8+Math.sin(i)*.25,-15,cloud);p.scale.set(1.4,.55,.8);p.castShadow=false;}
  scene.add(cloud);
  return time=>{
    steam.forEach((p,i)=>{const life=(time*.14+i*.25)%1;p.position.set(2.4+life*.65,4.85+life*1.7,-3.6);p.scale.setScalar(.12+life*.28);p.material.opacity=(1-life)*.24;});
    cloud.position.x=Math.sin(time*.025)*.8;
  };
}

export function waterMaterial(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#66bfc9';ctx.fillRect(0,0,512,512);
  for(let j=0;j<12;j++){
    ctx.strokeStyle=j%3?'#72c9cf':'#8bd5d5';ctx.globalAlpha=.28;ctx.lineWidth=2+j%2;
    ctx.beginPath();for(let x=-10;x<=522;x+=4){const y=j*46+Math.sin(x*.025+j)*7;x===-10?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.stroke();
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(26,26);
  return new THREE.MeshStandardMaterial({map:texture,roughness:.38,metalness:.08,color:'#d5f6ef'});
}
