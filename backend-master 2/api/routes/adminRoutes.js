const express=require('express');
const adminRoutes=express.Router();
const logger=require('../../Utils/winstonLogger');
const jwt=require('jsonwebtoken');
const multer=require('multer');
const xlstojson = require("xls-to-json-lc");
const xlsxtojson = require("xlsx-to-json-lc");
const nullChecker=require('../../Utils/nullChecker');

const upload=require('../../Utils/multer/commonExcelUpload');    //requiring multer for excel upload
const upload2=require('../../Utils/multer/productImagess3');   //requiring multer s3 for image upload
       
const securekey ='Imsecure';          //secret key of webtokens
const productCrud=require('../../db/crudOperations/Product'); 
const adminCrud=require('../../db/crudOperations/adminCrud');
const s3=require('../../Utils/multer/getImageFiles');
const singleUpload=upload.fields([
    {
      name:'categories'
    },
    {
      name:'subcategories'
    },                                 //keys of files incoming
    {
      name:'products'
    },
    {
      name:'subproducts'
    },{
        name:'priceAndAmount'
    }
    ]);        

adminRoutes.post('/upload',function(req,res){
    /* dont mess with multer the req above and below are not even same*/
    var xlsxj; //Initialization
   
    singleUpload(req,res,async function(err){
        //jwt.verify(req.body.idToken,securekey,(error,authData)=>{     //checking if token is present or not
            //if(error){
            //    res.json("session timed out");
            //}
            //else{
        if(err instanceof multer.MulterError){
            console.log(err);
        }else if(err){
            //console.log(req.file)
            res.json(err);    
        }
        //console.log(req.files);
        if(req.files.categories[0].originalname.split('.')[req.files.categories[0].originalname.split('.').length-1] === 'xlsx'){
            xlsxj = xlsxtojson;
        } else {
            xlsxj = xlstojson;
        }

        try {
            var categories=[];
            var subcategory=[];
            var products=[];
            var subProducts=[];
            var priceAndAmount=[];
            for(let key in req.files){
                //console.log(key);
            var pr=await new Promise(function(resolve,reject){
            xlsxj({
                input: req.files[key][0].path, 
                output: null,
                lowerCaseHeaders:true
            }, function(err,result){
                if(err) {
                    // return new Promise(function(resolve,reject){
                    //     reject({msg:'some error occured'});
                    // })
                    reject('some error occured');
                    res.json({error_code:1,err_desc:err, data: null});
                } 
                if(result!=null){
                   // productCrud.uploadProducts(req,res,result);
                    console.log(result);
                    if(key=='categories'){
                        
                        for(let category of result){
                            let category1={
                                categoryId:null,
                                categoryName:null,
                                childIds:[],
                                subcategory:[]
                            }
                            category1.categoryId=category.categoryid;           //converted string into array and
                            category1.categoryName=category.categoryname;  
                            console.log('we were here');     //defined structure
                            category1.childIds=convertArray(category.childids);
                            categories.push(category1);
                            //console.log(categories);
                        }
                    }
                    if(key=='subcategories'){
                        
                        for(let subcat of result){
                            let subcategory1={
                                subcategoryId:null,
                                subcategoryName:null,
                                childIds:[],
                                products:[]
                            }
                            subcategory1.subcategoryId=subcat.subcategoryid;           //converted string into array and
                            subcategory1.subcategoryName=subcat.subcategoryname;       //defined structure
                            subcategory1.childIds=convertArray(subcat.childids);
                            subcategory.push(subcategory1);
                        }
                    }
                    if(key=='products'){
                        
                        for(let product of result){
                            let product1={
                                productId:null,
                                productName:null,
                                childIds:[],
                                subProducts:[]
                            }
                            product1.productId=product.productid;           //converted string into array and
                            product1.productName=product.productname;       //defined structure
                            product1.childIds=convertArray(product.childids);
                            products.push(product1);
                        }
                    }
                    if(key=='subproducts'){
                        
                        for(let subproduct of result){
                            let subproduct1={
                                subproductId:null,
                                subproductName:null,
                                info:{
                                    description:null,
                                    benefitsAndUses:null,
                                    priceAndAmount:[]
                                },
                            }
                            subproduct1.subproductId=subproduct.subproductid;           //converted string into array and
                            subproduct1.subproductName=subproduct.subproductname;       //defined structure
                            subproduct1.info.description=subproduct.description;
                            subproduct1.info.benefitsAndUses=subproduct.benefitsanduses;
                            subProducts.push(subproduct1);
                        }
                    }
                    if(key=='priceAndAmount'){
                        priceAndAmount=result;
                    }
                    // return new Promise(function(resolve,reject){
                    //     console.log('returning promise');
                    //     resolve({msg: result});
                    // })
                    resolve('ok');

                }
                //productCrud.uploadProducts(req,res,obj);
                // result.forEach(obj=>{
                //     productCrud.uploadProducts(req,res,obj);                         //pushing objects to db after traversing
                // })
                
                //res.json({error_code:0,err_desc:null, data: result});
            });
            })
            //await wait(5000);

            }
            if(pr){
            console.log('join occured');
            //console.log(categories);
            //console.log(subcategory);
            //console.log(products);
            //console.log(subProducts);
            //console.log(priceAndAmount);
            subProducts=joinSubproducts(subProducts,priceAndAmount);
            //console.log(subProducts);
            products=joinProducts(products,subProducts);
            //console.log(products);
            subcategory=joinSubcategory(subcategory,products);
            var finalJson=joinExcelData(categories,subcategory);
            console.log(finalJson);
            productCrud.uploadProducts(req,res,finalJson);
            }
            

        } catch (e){
           res.json({error_code:1,err_desc:"Corupted excel file"});
        }
    //}
    //})
    })

        
   // })
    
});


adminRoutes.post('/getImagesUrl',(req,res)=>{
    let returnImagesArray={};
    for(let key of req.body.keyArray){
        console.log(key+' '+req.body.mobile_no+'.png',req.body.keyArray)
 let params={Bucket:'big-basket-bucket',Key:key+' '+req.body.mobile_no+'.png'}; //seconds

 s3.getObject(params,(url)=>{
    if(url!=null){
        console.log(url);
        returnImagesArray[key]=url;
    }
});
 
}
res.json({'Images':returnImagesArray});
}
)

adminRoutes.post('/editProducts',verifyToken,(req,res)=>{
    console.log('i m here',req.body)
    
    jwt.verify(req.token,securekey,(error,authData)=>{
        if(error){
            res.json("token not valid or session timed out");
        }
        else{
            //console.log("its here");
          // nullChecker.check(req.body.products,res);
            productCrud.editProducts(req,res);
        }
    })
    
})

adminRoutes.post('/editCategoryList',verifyToken, async function(req,res){
    jwt.verify(req.token,securekey,(error,authData)=>{
        if(error){
            res.json("token not valid or session timed out");
        }
        else{
           
            if(req.body.categorylist!=null){
         productCrud.uploadProducts(req,res,req.body.categorylist);
       
        }
    else{
        res.status(401).json('Empty Category Data');
    }}

    })
})

adminRoutes.post('/imageUpload',(req,res)=>{
  
            upload2(req,res,function(err){
                jwt.verify(req.body.idToken,securekey,(error,authData)=>{
                    
                    if(error){
                        res.status(401).json("Session TimeOut ,Please login again");
                    }
                    else{

           //    console.log(req.body,req.file,req.body.files);
                    //push url to db

                    nullChecker.check(req.file,res);
                    var obj={"uri":req.file.location};
                    if(req.file.location!=null && req.file!=null){
                    productCrud.imageUpload(req,res,obj);
                    }else{
                        res.json(401).json('No File Uploaded')
                    }
                    }})
                })
            
                
})


adminRoutes.post('/imageDelete',verifyToken,(req,res)=>{
    console.log(req.body)
        jwt.verify(req.token,securekey,(error,authData)=>{
            
            if(error){
                res.status(401).json("Session TimeOut ,Please login again");
            }
            else{

            productCrud.deleteImageBackend(req,res);
        
            }})
        
    


})



adminRoutes.post('/login',async function(req,res){
    var adminData= await adminCrud.login(res,{'id':req.body.id, 'name':req.body.name, 'password':req.body.password});
    console.log(adminData);
   if(adminData!=null){
        jwt.sign({adminData},securekey,{expiresIn:'3000s'},(err,token)=>{ 
                     //token is generated after checking the presence of user
        res.json({
            token:token
        })
    })
}else{
    res.status(401).json('Incorrect Id/Password');
}

})
adminRoutes.get('/getUnverifiedEmployee',verifyToken,(req,res)=>{
    console.log('i  m unverifiied');
    jwt.verify(req.token,securekey,(error,authData)=>{
            
        if(error){
            res.status(401).json("Session TimeOut ,Please login again");
        }
        else{

   
    adminCrud.getUnverifiedEmployees(res);
        }})
})


adminRoutes.get('/getVerifiedEmployee',verifyToken,(req,res)=>{
    console.log('i m here verify')
    jwt.verify(req.token,securekey,(error,authData)=>{
            
        if(error){
            res.status(401).json("Session TimeOut ,Please login again");
        }
        else{

    adminCrud.getVerifiedEmployees(res);}})
})

adminRoutes.post('/verifyUser',verifyToken,(req,res)=>{
    jwt.verify(req.token,securekey,(error,authData)=>{
            
        if(error){
            res.status(401).json("Session TimeOut ,Please login again");
        }
        else{

    adminCrud.verifyEmployee(req.body.id,res);}})
})
adminRoutes.post('/unVerifyUser',verifyToken,(req,res)=>{
    jwt.verify(req.token,securekey,(error,authData)=>{
            
        if(error){
            res.status(401).json("Session TimeOut ,Please login again");
        }
        else{

    adminCrud.unVerifyEmployee(req.body.id,res);}})
})


function verifyToken(req,res,next){               //checking for webtoken in the header of req and filling it into req.token
    let bearerHeader = req.headers['authorization'];
    console.log(bearerHeader);
    if(typeof bearerHeader!= 'undefined'){
    const bearer = bearerHeader.split(' ');
    const bearerToken = bearer[1];
    req.token= bearerToken;
    next();
    
    }else{
        res.status(403).json('Session TimeOut ,Please login again');
    }
}

function wait(ms) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        console.log("Done waiting");
        resolve(ms)
      }, ms )
    })
  } 

function convertArray(string){
    var array=[];
    array=string.split(' ');           //converting combined ids into array of ids
    console.log(array);
    return array;
}

function joinExcelData(categories,subcategory){
    var finalJson=[];
    for(let category of categories){
        for(let subcatid of category.childIds){
            for(let subcat of subcategory){
                if(subcatid==subcat.subcategoryId){
                    category.subcategory.push(subcat);
                }

            }
        }
        finalJson.push(category);
    }
    return finalJson;
}
function joinSubproducts(subProducts,priceAndAmount){
    for(subproduct of subProducts){
        for(pna of priceAndAmount){
            if(pna.subproductid==subproduct.subproductId){
                subproduct.info.priceAndAmount.push(pna);
            }
        }
    }
    return subProducts;
}
function joinProducts(products,subProducts){
    console.log('trying to generate')
    for(let product of products){
        for(let subproductId of product.childIds){
            for(let subProduct of subProducts){
                if(subproductId==subProduct.subproductId){
                    product.subProducts.push(subProduct);
                }
            }
        }
    }

    return products;
}
function joinSubcategory(subcategory,products){
    for(let subcat of subcategory){
        for(let productId of subcat.childIds){
            for(let product of products){
                if(productId==product.productId){
                    subcat.products.push(product);
                }
            }
        }
    }

    return subcategory;
}




module.exports=adminRoutes;