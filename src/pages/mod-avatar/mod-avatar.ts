import { Component, ViewChild } from '@angular/core';
import { Headers } from '@angular/http';
import { NavController, NavParams, ActionSheetController, Platform } from 'ionic-angular';
import { DomSanitizer } from '@angular/platform-browser';
import { ImagePicker } from '@ionic-native/image-picker';
import { Camera } from '@ionic-native/camera';
import { Crop } from '@ionic-native/crop';
import { Storage } from '@ionic/storage';
import { UserService } from '../../services/user';
import { SystemService } from '../../services/system';

import { MyHttp } from '../../providers/my-http';
import 'rxjs/add/operator/toPromise';

import {API_HOST} from '../../config/config';

var fileFactory = {
	createByDataURL:function(dataURL,fileName,callback,options= {}){
		var imgDOM = new Image();
		var canvasDOM = document.createElement('canvas');
		var ctx = canvasDOM.getContext('2d');

		imgDOM.onload = function(){
			//裁剪
			canvasDOM.width = options['destWidth'] || imgDOM.width;
			canvasDOM.height = options['destHeight'] || imgDOM.height;

			//ctx.drawImage(imgDOM,0,0,null,null); 会出现全透明的情况
			if(options['imgWidth'] && options['imgHeight']){
				ctx.drawImage(imgDOM,0,0,options['imgWidth'] ,options['imgHeight']);
			}else{
				ctx.drawImage(imgDOM,0,0);
			}
			

			canvasDOM.toBlob(function(blob){
				var file = new File([blob],fileName);
			
				callback(file);
			});

		};
		imgDOM.src = dataURL;
	}
}

@Component({
	selector: 'cy-mod-avatar-page',
	templateUrl: 'mod-avatar.html'
})
export class ModAvatarPage {

	avatarSrc;

	constructor(
		private sanitizer: DomSanitizer,
		private platform:Platform,
		private navCtrl: NavController,
		private navParams: NavParams,
		private storage: Storage,
		private imagePicker: ImagePicker,
		private camera: Camera,
		private crop: Crop,
		private actionSheetCtrl: ActionSheetController,
		private userService: UserService,
		private systemService: SystemService,
		private myHttp: MyHttp
	) {
		// this.avatarSrc = navParams.data['avatarSrc'];

	}

	ngOnInit(){
		this.userService.own$.subscribe(own => {
			this.avatarSrc = own.avatarSrc;
		});
	}


	presentActionSheet() {
		let supportCordova = this.platform.is('cordova');

		var buttons;
		
		if(supportCordova){
			buttons = [
				{
					text: '拍照',
					handler: () => {
						this.setByPhotograph();
					}
				}, {
					text: '从手机相册选择',
					handler: () => {
						this.setByAlbum();

					}
				}, {
					text: '取消',
					role: 'cancel',
					handler: () => {

					}
				}
			];
		}else{
			buttons = [
				{
					text: '从手机相册选择',
					handler: () => {
						this.setByAlbum_html5();
	
					}
				},
				{
					text: '取消',
					role: 'cancel',
					handler: () => {

					}
				}
			];
		}
		

		let actionSheet = this.actionSheetCtrl.create({
			buttons: buttons
		});
		actionSheet.present();
	}

	//通过拍照设置头像
	setByPhotograph() {
		let supportCordova = this.platform.is('cordova');

		if (!supportCordova) return this.systemService.showToast('该功能暂不支持浏览器，请下载APP体验');

		let loading;
		this.photograph()
			.then((imageData) => {
				return this.cropImg(imageData);
			})
			.then(newImagePath => {
				loading = this.systemService.showLoading();
				return this.userService.modAvatar(newImagePath).toPromise();
			})
			.then(res => {
				this.systemService.closeLoading(loading);
				this.avatarSrc = res.data.avatarSrc;
			})
			.catch(err => {
				this.systemService.closeLoading(loading);
				this.myHttp.handleError(err, '设置头像失败')
			});
	}

	//通过手机相册设置头像
	setByAlbum() {
		let supportCordova = this.platform.is('cordova');
		
		if (!supportCordova) return this.systemService.showToast('该功能暂不支持浏览器，请下载APP体验');

		let loading;
		this.openAlbum()
			.then((uri) => {
				return this.cropImg(uri);
			})
			.then(newImagePath => {
				loading = this.systemService.showLoading();
				return this.userService.modAvatar(newImagePath).toPromise();
			})
			.then(res => {
				this.systemService.closeLoading(loading);
				this.avatarSrc = res['data'].avatarSrc;
			})
			.catch(err => this.myHttp.handleError(err, '设置头像失败'));

	}

	setByAlbum_html5(){
		var that = this;
		
		var fileDOM = document.createElement('input');
		fileDOM.setAttribute('type','file');
		document.body.appendChild(fileDOM);

		fileDOM.addEventListener('change',function(){
			var file = this.files[0];
			var fr = new FileReader();

			fr.readAsDataURL(file);

			fr.onload = function(res){

				var dataURL = res.target['result'];

				fileFactory.createByDataURL(dataURL,file.name,function(_file){
					that.userService.modAvatar2(_file)
					.subscribe(
						res=>{
							// that.avatarSrc = that.sanitizer.bypassSecurityTrustUrl(res['data'].avatarSrc);
							//that.avatarSrc = res['data'].avatarSrc;
						}
					);
				},{destWidth:100,destHeight:100});

			};

			
		},false);

		fileDOM.click();
	}

	//拍照
	photograph() {
		var options = {
			allowEdit: false,
			targetWidth: 400,
			targetHeight: 400,
		};

		return this.camera.getPicture(options);
	}

	//裁剪图片
	cropImg(uri) {
		return this.crop.crop(uri, { quality: 100 });
	}

	//打开手机相册
	openAlbum(): Promise<string> {

		var options = {
			maximumImagesCount: 1
		};
		return this.imagePicker.getPictures(options).then(val => {
			return val[0];
		})
	}




}
