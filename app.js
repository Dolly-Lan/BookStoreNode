var express = require('express');
var http = require('http');
var monk = require('monk');

//配置express
var app = express();
app.set('port',3001);

//启动express服务
http
    .createServer(app)
    .listen(app.get('port'), function() {
        console.log('Express server listening on port ' + app.get('port'));
    });

//连接mongodb
var db = monk('localhost:27017/BookStore');

//配置路由
app.get('/books',list);
app.get('/books/:curPage/:pageSize',list);
app.get('/books/:curPage/:pageSize/:search',search);
app.get('/books/del/:id/:curPage/:pageSize/:search',del);

function list(req, res) {
    res.header("Access-Control-Allow-Origin", "*");
    var booksCollection = db.get('books');
    var limit = parseInt(req.params.pageSize?req.params.pageSize:1);
    var curPage = parseInt(req.params.curPage?req.params.curPage:1);
    var data = {};
    booksCollection
        .count()
        .then((docs)=>{
            data.pages = Math.ceil(docs/limit);
            data.curPage = curPage;
            data.pageSize = limit;
            return booksCollection.find({},{limit:limit,skip:(curPage-1)*limit})
        })
        .then((docs) => {
            data.books = docs;
            res.json(data);
        });
};

function search(req,res){
    res.header("Access-Control-Allow-Origin", "*");
    var booksCollection = db.get('books');
    var searchCollection = db.get('search');
    searchCollection.remove({});
    var limit = parseInt(req.params.pageSize?req.params.pageSize:1);
    var curPage = parseInt(req.params.curPage?req.params.curPage:1);
    var searchStr = {};
    var data = {};
    searchStr = function () {
        var obj = {};
        if(req.params.search){
            obj = {name:new RegExp(req.params.search)}  //对name字段支持“模糊查询”
        }
        return obj;
    }();
    booksCollection
        .find(searchStr,{"_id":0})
        .then((docs)=>{
            for(var i = 0;i<(docs.length);i++){
                if(i == docs.length-1){
                    return searchCollection.insert(docs[i]);
                }
                else{
                    searchCollection.insert(docs[i]);
                }
            }
        })
        .then((docs) =>{
            console.log(docs);
            data.pages = 0;
            data.curPage = curPage;
            data.pageSize = limit;
            data.books = docs;
            return searchCollection.count()
        })
        .then((docs) => {
            data.pages = Math.ceil(docs/limit);
            res.json(data);
        })
}

function del(req,res) {
    res.header("Access-Control-Allow-Origin", "*");
    var booksCollection = db.get('books');
    var searchCollection = db.get('search');
    searchCollection.remove({});
    var id = parseInt(req.params.id);
    var limit = parseInt(req.params.pageSize?req.params.pageSize:1);
    var curPage = parseInt(req.params.curPage?req.params.curPage:1);
    var data = {};
    var searchStr = {};
    searchStr = function () {
        var obj = {};
        if(req.params.search){
            obj = {name:new RegExp(req.params.search)}  //对name字段支持“模糊查询”
        }
        return obj;
    }();
    booksCollection
        .remove({id:id})
        .then((docs)=>{
            return booksCollection.find(searchStr,{"_id":0})
        })
        .then((docs)=>{
            docs.forEach(function (doc) {
                searchCollection.insert(doc);
            })
            return searchCollection.count()
        })
        .then((docs) =>{
            data.pages = Math.ceil(docs/limit);
            data.pageSize = limit;
            data.curPage = curPage;
            return searchCollection.find({},{limit:limit,skip:(curPage-1)*limit})
        }).then((docs)=>{
            data.books = docs;
            res.json(data);
        })
}

