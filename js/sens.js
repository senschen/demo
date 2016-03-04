/**
 * Created by SensChen on 2014/12/29.
 * sens1992@qq.com
 */

//Sens类用于心电图绘制
var Sens = {
    old : new Array(500),//旧的500个数据
    time : null,
    oldTime : null,
    oldDate : null,
    tempDelay : null,//临时存储延迟时间
    secondsDelay : null,//延迟的秒数
    delay : null,  //本地延迟时间
    offset : 0,   //本地延迟时间修正量
    leave : 0,    //本地延迟时间修正剩余量
    delayBoxLocal : $('.user-delay-local'),
    delayBoxNet : $('.user-delay-network'),
    dateBox : $('.user-date'),
    box : $('.data-canvas'),
    desc : $('.user-desc'),
    power : false,
    start : false,
    //初始化数组
    dataInit: function(){
        $.each(Sens.old,function(i){
            Sens.old[i] = 500;
        })
    },

    //读数据,不可跨域
    readFile: function(url){
        var val = '无数据';
        $.ajax({
            url: url,
            type: 'get',
            dataType: 'json',
            cache:false,
            async: false,
            success: function (data) {
                val = data;
            }
        });
        return val;
    },

    //读本地数据。仅支持IE、火狐，不建议使用
    readLocalFile: function(src){
        var ForReading = 1;
        var fso = new ActiveXObject("Scripting.FileSystemObject");
        var f = fso.OpenTextFile(src, ForReading);
        return (f.ReadAll());
    },

    //字符串数据分割成数组
    handleData: function(str){
        return str.split(' ');
    },

    //第一次绘制数据
    drawInit: function(){
        Sens.dataInit();
    },

    //持续绘图过程
    drawSeq: function (cvs, ctx, url) {
        //打开了电源并且点击过开始播放
        if (Sens.power&&Sens.start) {
            //读心电数据值
            var data = Sens.readFile(url);
            var val = data[3];
            var dateTime = data[2];
            Sens.clearCanvas(cvs, ctx);
            //还原画板位置
            Sens.box.css('left', 0);

            //时间操作
            Sens.changeDelay(data);

            //绘出静态图
            Sens.drawStatic(ctx,val);

            //移动图然后递归继续执行本函数
            Sens.box.animate({left: '-500px'}, 2000 - Sens.delay, 'linear', function () {
                Sens.drawSeq(cvs, ctx, url);
            });
            Sens.check(dateTime,val);
        }
        else{
            console.log('已关机');
        }
    },

    //操作时间
    changeDelay: function(data){
        //第一次运行时基准时间初始化
        if(Sens.oldTime == null){
            Sens.oldTime = new Date();
        }

        //当前时间获取
        Sens.time = new Date();
        //分别求毫秒和秒的时间差
        Sens.tempDelay =  Sens.time.getMilliseconds() - Sens.oldTime.getMilliseconds();
        Sens.secondsDelay = Sens.time.getSeconds() - Sens.oldTime.getSeconds();
        //基准时间的秒数更新
        Sens.oldTime.setSeconds(Sens.oldTime.getSeconds() + 2);

        //延迟在2秒以内或者出现计时器错误导致的回退一位时，时间依然准确
        if ((Sens.secondsDelay <= 2 && Sens.secondsDelay >= -2) || Sens.secondsDelay == 59) {
            Sens.delay = Sens.tempDelay + 1000 * Sens.secondsDelay;   //毫秒的延迟
            if(Sens.delay >= 0){
                //本地延迟更新
                Sens.delayBoxLocal.text(Sens.delay + 'ms');
            }
            else {
                console.log('时钟周期变短');
                Sens.delayBoxLocal.text('0ms');
            }
        }
        //卡顿延迟过大
        else{
            alert('播放过程中发生严重错误，可能是由于数据读取失败，发生较长时间的卡顿造成！')
        }

        //数据生成时间更新
        if(data[2] != Sens.oldDate){
            var date = data[2].split(' ')[0];
            var time = data[2].split(' ')[1];
            Sens.dateBox.html(date + '<br/>' + time);
            Sens.oldDate = data[2];
            //判断数据时间延迟
            var a = date.split('-');
            if(a[0] == Sens.time.getFullYear()&&a[1] == Sens.time.getMonth()+1){
                if(a[2] == Sens.time.getDate()){
                    var b = time.split(':');
                    var del = Sens.time.getHours()*3600 + Sens.time.getMinutes()*60 + Sens.time.getSeconds()
                        - parseInt(b[0])*3600 - parseInt(b[1])*60 - parseInt(b[2]);
                    var h = parseInt(del/3600);
                    var m = parseInt(del%3600/60);
                    var s = parseInt(del%60);
                    Sens.delayBoxNet.text(h+'时'+m+'分'+s+'秒');
                }
                else{
                    Sens.delayBoxNet.text(Sens.time.getDate() - a[2] + '天以前');
                }
            }
            else{
                Sens.delayBoxNet.text('很久以前');
            }
        }
        else{
            Sens.dateBox.html('数据中断了！<br/>');
        }
    },

    //绘图
    drawStatic: function(ctx,val){
        var start_x = 0;
        var start_y = 190 - (Sens.old[499] - 500) / 2;
        ctx.moveTo(start_x, start_y);
        for (var i = 0; i < 500; i++) {
            ctx.lineTo(start_x + 1, (190 - (Sens.old[i] - 500) / 2));
            start_x += 1;
        }
        for (i = 0; i < 500; i++) {
            Sens.old[i] = val[i];
            ctx.lineTo(start_x + 1, (190 - (val[i] - 500) / 2));
            start_x += 1;
        }
        ctx.stroke();
    },

    //检测病症
    check: function(dateTime,val){
        dateTime = dateTime.replace(/-/g,"/");
        var max = val[0];
        var sub = 0;
        var time; //记录经过多少毫秒出现症状
        var date; //记录出现的具体时间
        for (i = 1; i < 250; i++) {
            if(val[i] > max){
                max = val[i];
                sub = i;
            }
        }
        if(max < 700){
            time = (sub/500.0 * 2000);
            date = new Date(dateTime);
            date = new Date(date.getTime() + time).toString();
            Sens.desc.text(date.substr(0,25)+'心跳强度较弱');
        }
        else{
            console.log('心跳强度正常');
        }
        max =  val[i];
        sub = 0;
        for (i; i < 500; i++) {
            if(val[i] > max){
                max = val[i];
                sub = i;
            }
        }
        if(max < 700 && max >500){
            time = (sub/500.0 * 2000);
            date = new Date(dateTime);
            date = new Date(date.getTime() + time).toString();
            Sens.desc.text(date.substr(0,25)+'心跳强度较弱');
        }
        else{
            if(max == 500){
                time = (sub/500.0 * 2000);
                date = new Date(dateTime);
                date = new Date(date.getTime() + time).toString();
                Sens.desc.text(date.substr(0,25)+'未收到心跳信号');
            }
            else{
                console.log('心跳强度正常');
            }
        }
    },

    //清空画布
    clearCanvas: function(cvs,ctx){
        ctx.beginPath();
        ctx.clearRect(0,0,cvs.width,cvs.height);
    }
};
